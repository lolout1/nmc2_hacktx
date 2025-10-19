"""
OpenAI-Powered RAG System for F1 Race Analysis
===============================================
Retrieval-Augmented Generation system that aggregates all race context
and uses OpenAI GPT-4 for intelligent race strategy analysis.

Features:
- Context aggregation from all data sources
- Semantic chunking for optimal token usage
- Conversation history management
- Auto-generated race summaries
- Interactive Q&A
"""

import json
import sys
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI package not installed. Run: pip install openai")


@dataclass
class RaceContext:
    """Structured race context for RAG"""
    session_info: Dict
    driver_state: Dict
    performance_metrics: Dict
    strategy_data: Dict
    competition: Dict
    ml_predictions: Dict
    conditions: Dict
    recent_incidents: List[Dict]
    current_state: Dict


class F1DataAggregator:
    """
    Aggregates all F1 race data into optimal context for LLM
    
    Collects data from:
    - OpenF1 cache (laps, positions, pit stops, stints, weather)
    - Timing data
    - ML predictions
    - Race control messages
    """
    
    def __init__(self, session_key: str):
        self.session_key = session_key
        self.cache_dir = os.path.join(os.getcwd(), '.openf1_cache')
    
    def aggregate_all_context(
        self,
        driver_number: int,
        current_lap: Optional[int] = None,
        timing_data: Optional[Dict] = None,
        ml_predictions: Optional[Dict] = None
    ) -> RaceContext:
        """
        Aggregate ALL available race context
        
        Returns structured RaceContext with all relevant data
        """
        print(f"[RAG] Aggregating context for driver #{driver_number}...")
        
        # Load from OpenF1 cache
        laps = self._load_csv('laps')
        positions = self._load_csv('positions')
        pit_stops = self._load_csv('pit')
        stints = self._load_csv('stints')
        weather = self._load_csv('weather')
        race_control = self._load_csv('race_control')
        metadata = self._load_json('metadata')
        
        # Build context sections
        context = RaceContext(
            session_info=self._build_session_info(metadata),
            driver_state=self._build_driver_state(driver_number, laps, positions, stints, timing_data),
            performance_metrics=self._build_performance_metrics(driver_number, laps),
            strategy_data=self._build_strategy_data(driver_number, pit_stops, stints),
            competition=self._build_competition_context(positions, timing_data),
            ml_predictions=self._build_ml_context(driver_number, ml_predictions),
            conditions=self._build_conditions_context(weather),
            recent_incidents=self._build_incidents_context(race_control, current_lap),
            current_state=self._build_current_state(driver_number, current_lap, positions, timing_data)
        )
        
        print(f"[RAG] ✓ Context aggregation complete")
        return context
    
    def _load_csv(self, data_type: str) -> pd.DataFrame:
        """Load CSV from cache"""
        filepath = os.path.join(self.cache_dir, f'session_{self.session_key}_{data_type}.csv')
        if os.path.exists(filepath):
            try:
                return pd.read_csv(filepath)
            except Exception as e:
                print(f"[RAG] Warning: Could not load {data_type}: {e}")
                return pd.DataFrame()
        return pd.DataFrame()
    
    def _load_json(self, data_type: str) -> Dict:
        """Load JSON from cache"""
        filepath = os.path.join(self.cache_dir, f'session_{self.session_key}_{data_type}.json')
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[RAG] Warning: Could not load {data_type}: {e}")
                return {}
        return {}
    
    def _build_session_info(self, metadata: Dict) -> Dict:
        """Build session information"""
        session = metadata.get('sessionInfo', {})
        meeting = metadata.get('meeting', {})
        
        return {
            'name': session.get('session_name', 'Unknown'),
            'type': session.get('session_type', 'Unknown'),
            'circuit': session.get('circuit_short_name', 'Unknown'),
            'country': meeting.get('country_name', 'Unknown'),
            'location': meeting.get('location', 'Unknown'),
            'date': session.get('date_start', 'Unknown')
        }
    
    def _build_driver_state(
        self,
        driver_number: int,
        laps: pd.DataFrame,
        positions: pd.DataFrame,
        stints: pd.DataFrame,
        timing_data: Optional[Dict]
    ) -> Dict:
        """Build current driver state"""
        state = {'driver_number': driver_number}
        
        # Position
        if not positions.empty:
            driver_pos = positions[positions['driver_number'] == driver_number]
            if not driver_pos.empty:
                state['position'] = int(driver_pos.iloc[-1]['position'])
        
        # Laps completed
        if not laps.empty:
            driver_laps = laps[laps['driver_number'] == driver_number]
            if not driver_laps.empty:
                state['laps_completed'] = len(driver_laps)
                
                # Last lap time
                last_lap = driver_laps.iloc[-1]
                if 'lap_duration' in last_lap and pd.notna(last_lap['lap_duration']):
                    state['last_lap_time'] = float(last_lap['lap_duration'])
                
                # Best lap
                valid_laps = driver_laps[driver_laps['lap_duration'].notna()]
                if not valid_laps.empty:
                    state['best_lap_time'] = float(valid_laps['lap_duration'].min())
        
        # Current stint/tire
        if not stints.empty:
            driver_stints = stints[stints['driver_number'] == driver_number]
            if not driver_stints.empty:
                current_stint = driver_stints.iloc[-1]
                state['tire_compound'] = current_stint.get('compound', 'Unknown')
                state['tire_age_at_start'] = int(current_stint.get('tyre_age_at_start', 0))
                state['stint_start_lap'] = int(current_stint.get('lap_start', 0))
        
        # From timing data
        if timing_data and 'Lines' in timing_data:
            driver_line = timing_data['Lines'].get(str(driver_number), {})
            if driver_line:
                state['gap_to_leader'] = driver_line.get('GapToLeader')
                state['interval'] = driver_line.get('IntervalToPositionAhead', {}).get('Value')
                state['in_pit'] = driver_line.get('InPit', False)
        
        return state
    
    def _build_performance_metrics(self, driver_number: int, laps: pd.DataFrame) -> Dict:
        """Build performance analysis"""
        if laps.empty:
            return {}
        
        driver_laps = laps[laps['driver_number'] == driver_number]
        if driver_laps.empty:
            return {}
        
        valid_laps = driver_laps[driver_laps['lap_duration'].notna() & (driver_laps['lap_duration'] > 0)]
        if valid_laps.empty:
            return {}
        
        lap_times = valid_laps['lap_duration'].values
        recent_5 = lap_times[-5:] if len(lap_times) >= 5 else lap_times
        
        metrics = {
            'total_laps': len(valid_laps),
            'average_lap_time': float(np.mean(lap_times)),
            'recent_average': float(np.mean(recent_5)),
            'best_lap': float(np.min(lap_times)),
            'worst_lap': float(np.max(lap_times)),
            'consistency_std': float(np.std(lap_times)),
        }
        
        # Trend analysis
        if len(recent_5) >= 3:
            trend_slope = np.polyfit(range(len(recent_5)), recent_5, 1)[0]
            if trend_slope > 0.3:
                metrics['trend'] = 'degrading'
            elif trend_slope < -0.3:
                metrics['trend'] = 'improving'
            else:
                metrics['trend'] = 'stable'
        else:
            metrics['trend'] = 'insufficient_data'
        
        # Sector analysis
        if 'duration_sector_1' in valid_laps.columns:
            recent_laps = valid_laps.tail(5)
            metrics['sector_1_avg'] = float(recent_laps['duration_sector_1'].mean())
            metrics['sector_2_avg'] = float(recent_laps['duration_sector_2'].mean())
            metrics['sector_3_avg'] = float(recent_laps['duration_sector_3'].mean())
        
        return metrics
    
    def _build_strategy_data(
        self,
        driver_number: int,
        pit_stops: pd.DataFrame,
        stints: pd.DataFrame
    ) -> Dict:
        """Build strategy information"""
        strategy = {}
        
        if not pit_stops.empty:
            driver_pits = pit_stops[pit_stops['driver_number'] == driver_number]
            strategy['pit_stops_made'] = len(driver_pits)
            
            if not driver_pits.empty:
                strategy['pit_laps'] = driver_pits['lap_number'].tolist()
                strategy['pit_durations'] = driver_pits['pit_duration'].tolist()
                strategy['avg_pit_duration'] = float(driver_pits['pit_duration'].mean())
        else:
            strategy['pit_stops_made'] = 0
        
        if not stints.empty:
            driver_stints = stints[stints['driver_number'] == driver_number]
            if not driver_stints.empty:
                strategy['number_of_stints'] = len(driver_stints)
                strategy['tire_strategy'] = driver_stints['compound'].tolist()
        
        return strategy
    
    def _build_competition_context(
        self,
        positions: pd.DataFrame,
        timing_data: Optional[Dict]
    ) -> Dict:
        """Build competition standings"""
        competition = {}
        
        if timing_data and 'Lines' in timing_data:
            standings = []
            for driver_num, line in timing_data['Lines'].items():
                if 'Position' in line:
                    standings.append({
                        'driver': driver_num,
                        'position': line['Position'],
                        'gap': line.get('GapToLeader')
                    })
            
            standings.sort(key=lambda x: int(x['position']))
            competition['current_standings'] = standings[:10]  # Top 10
        
        return competition
    
    def _build_ml_context(self, driver_number: int, ml_predictions: Optional[Dict]) -> Dict:
        """Build ML predictions context"""
        if not ml_predictions or driver_number not in ml_predictions:
            return {}
        
        pred = ml_predictions[driver_number]
        return {
            'predicted_position': pred.get('predicted_position'),
            'confidence': pred.get('confidence'),
            'win_probability': pred.get('win_probability'),
            'podium_probability': pred.get('podium_probability'),
            'recommended_action': pred.get('recommendation', {}).get('action'),
            'expected_lap_time': pred.get('predicted_lap_time')
        }
    
    def _build_conditions_context(self, weather: pd.DataFrame) -> Dict:
        """Build track conditions"""
        if weather.empty:
            return {}
        
        latest = weather.iloc[-1]
        return {
            'air_temperature': float(latest.get('air_temperature', 0)),
            'track_temperature': float(latest.get('track_temperature', 0)),
            'humidity': float(latest.get('humidity', 0)),
            'pressure': float(latest.get('pressure', 0)),
            'rainfall': bool(latest.get('rainfall', 0)),
            'wind_speed': float(latest.get('wind_speed', 0)),
            'wind_direction': int(latest.get('wind_direction', 0))
        }
    
    def _build_incidents_context(self, race_control: pd.DataFrame, current_lap: Optional[int]) -> List[Dict]:
        """Build recent incidents"""
        if race_control.empty:
            return []
        
        # Get recent incidents (last 10)
        recent = race_control.tail(10)
        
        incidents = []
        for _, incident in recent.iterrows():
            incidents.append({
                'lap': int(incident.get('lap_number', 0)),
                'message': incident.get('message', ''),
                'category': incident.get('category', ''),
                'flag': incident.get('flag', '')
            })
        
        return incidents
    
    def _build_current_state(
        self,
        driver_number: int,
        current_lap: Optional[int],
        positions: pd.DataFrame,
        timing_data: Optional[Dict]
    ) -> Dict:
        """Build current race state snapshot"""
        state = {'timestamp': datetime.now().isoformat()}
        
        if current_lap:
            state['current_lap'] = current_lap
        
        if timing_data and 'Lines' in timing_data:
            driver_line = timing_data['Lines'].get(str(driver_number), {})
            if driver_line:
                state['position'] = driver_line.get('Position')
                state['status'] = 'IN_PIT' if driver_line.get('InPit') else 'ON_TRACK'
        
        return state


class OpenAIRaceAnalyst:
    """
    OpenAI-powered Race Strategy Analyst
    
    Uses GPT-4 with RAG for intelligent race analysis
    """
    
    def __init__(self, api_key: str):
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI package not installed")
        
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4-turbo-preview"  # or "gpt-3.5-turbo" for faster/cheaper
        self.conversation_history = []
    
    def format_context_for_prompt(self, context: RaceContext) -> str:
        """Format race context into optimal prompt structure"""
        
        sections = []
        
        # Session Info
        if context.session_info:
            sections.append(f"""
## SESSION INFORMATION
- Race: {context.session_info.get('name', 'Unknown')}
- Circuit: {context.session_info.get('circuit', 'Unknown')}, {context.session_info.get('country', 'Unknown')}
- Type: {context.session_info.get('type', 'Unknown')}
""")
        
        # Driver State
        if context.driver_state:
            ds = context.driver_state
            sections.append(f"""
## DRIVER #{ds.get('driver_number', '?')} - CURRENT STATE
- Position: P{ds.get('position', '?')}
- Laps Completed: {ds.get('laps_completed', '?')}
- Last Lap Time: {ds.get('last_lap_time', 'N/A')}s
- Best Lap Time: {ds.get('best_lap_time', 'N/A')}s
- Current Tire: {ds.get('tire_compound', 'Unknown')} (Stint Start: Lap {ds.get('stint_start_lap', '?')})
- Gap to Leader: {ds.get('gap_to_leader', 'N/A')}
- Interval to Car Ahead: {ds.get('interval', 'N/A')}
- Status: {'IN PIT' if ds.get('in_pit') else 'ON TRACK'}
""")
        
        # Performance Metrics
        if context.performance_metrics:
            pm = context.performance_metrics
            sections.append(f"""
## PERFORMANCE ANALYSIS
- Total Laps: {pm.get('total_laps', 0)}
- Average Lap Time: {pm.get('average_lap_time', 0):.3f}s
- Recent 5-Lap Average: {pm.get('recent_average', 0):.3f}s
- Best Lap: {pm.get('best_lap', 0):.3f}s
- Consistency (Std Dev): ±{pm.get('consistency_std', 0):.3f}s
- Lap Time Trend: {pm.get('trend', 'Unknown').upper()}
""")
            
            if 'sector_1_avg' in pm:
                sections.append(f"""
### Sector Times (Recent Average)
- Sector 1: {pm['sector_1_avg']:.3f}s
- Sector 2: {pm['sector_2_avg']:.3f}s
- Sector 3: {pm['sector_3_avg']:.3f}s
""")
        
        # Strategy
        if context.strategy_data:
            sd = context.strategy_data
            sections.append(f"""
## STRATEGY
- Pit Stops Made: {sd.get('pit_stops_made', 0)}
- Pit Stop Laps: {', '.join(map(str, sd.get('pit_laps', []))) or 'None'}
- Average Pit Duration: {sd.get('avg_pit_duration', 'N/A')}s
- Tire Strategy: {' → '.join(sd.get('tire_strategy', ['Unknown']))}
""")
        
        # ML Predictions
        if context.ml_predictions:
            ml = context.ml_predictions
            sections.append(f"""
## ML PREDICTIONS (HPC-Powered)
- Predicted Finish: P{ml.get('predicted_position', '?')}
- Confidence: {ml.get('confidence', 'N/A')}
- Win Probability: {(ml.get('win_probability', 0) * 100):.1f}%
- Podium Probability: {(ml.get('podium_probability', 0) * 100):.1f}%
- Recommended Action: {ml.get('recommended_action', 'N/A')}
- Expected Lap Time: {ml.get('expected_lap_time', 'N/A')}s
""")
        
        # Conditions
        if context.conditions:
            cond = context.conditions
            sections.append(f"""
## TRACK CONDITIONS
- Air Temperature: {cond.get('air_temperature', 0):.1f}°C
- Track Temperature: {cond.get('track_temperature', 0):.1f}°C
- Humidity: {cond.get('humidity', 0):.1f}%
- Rainfall: {'YES' if cond.get('rainfall') else 'NO'}
- Wind: {cond.get('wind_speed', 0):.1f} m/s @ {cond.get('wind_direction', 0)}°
""")
        
        # Competition
        if context.competition and 'current_standings' in context.competition:
            standings_text = "\n".join([
                f"P{s['position']}: Driver #{s['driver']} ({s.get('gap', 'Leader')})"
                for s in context.competition['current_standings'][:10]
            ])
            sections.append(f"""
## CURRENT STANDINGS (Top 10)
{standings_text}
""")
        
        # Recent Incidents
        if context.recent_incidents:
            incidents_text = "\n".join([
                f"- Lap {i['lap']}: {i['message']} ({i['category']})"
                for i in context.recent_incidents[-5:]
            ])
            sections.append(f"""
## RECENT RACE INCIDENTS
{incidents_text}
""")
        
        return "\n".join(sections)
    
    def generate_summary(self, context: RaceContext) -> str:
        """Generate automatic race summary"""
        context_prompt = self.format_context_for_prompt(context)
        
        system_prompt = """You are an expert F1 race strategist and data analyst. 
You provide clear, actionable insights based on real-time race data.
Be concise, data-driven, and specific. Focus on what matters for winning the race."""
        
        user_prompt = f"""{context_prompt}

Based on the above race data, provide a strategic summary for the race engineer.

Format your response EXACTLY as:

**SITUATION**
[1-2 sentences describing current race position and performance]

**KEY CONCERNS**
• [Concern 1]
• [Concern 2]
• [Concern 3]

**OPPORTUNITIES**
• [Opportunity 1]
• [Opportunity 2]

**IMMEDIATE ACTION**
[One clear, specific recommendation]

Be direct. Use data. No fluff."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            summary = response.choices[0].message.content
            
            # Store in history
            self.conversation_history.append({
                'type': 'summary',
                'content': summary,
                'timestamp': datetime.now().isoformat()
            })
            
            return summary
            
        except Exception as e:
            print(f"[OpenAI] Error generating summary: {e}")
            raise
    
    def answer_question(self, question: str, context: RaceContext) -> str:
        """Answer specific question about race"""
        context_prompt = self.format_context_for_prompt(context)
        
        system_prompt = """You are an expert F1 race strategist with deep knowledge of racing, 
strategy, tire management, and data analysis. Answer questions clearly and specifically, 
using the provided race data. Be direct and actionable."""
        
        user_prompt = f"""{context_prompt}

**QUESTION:** {question}

Provide a clear, data-driven answer. Reference specific numbers from the data when relevant."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            answer = response.choices[0].message.content
            
            # Store in history
            self.conversation_history.append({
                'type': 'qa',
                'question': question,
                'answer': answer,
                'timestamp': datetime.now().isoformat()
            })
            
            return answer
            
        except Exception as e:
            print(f"[OpenAI] Error answering question: {e}")
            raise
    
    def get_conversation_history(self) -> List[Dict]:
        """Get conversation history"""
        return self.conversation_history
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []


def main():
    """CLI interface for testing"""
    if len(sys.argv) < 4:
        print("Usage: python openai_rag.py <session_key> <driver_number> <action> [question]")
        print("Actions: summary, question")
        print("Example: python openai_rag.py 9161 1 summary")
        print("Example: python openai_rag.py 9161 1 question 'Should we pit now?'")
        sys.exit(1)
    
    session_key = sys.argv[1]
    driver_number = int(sys.argv[2])
    action = sys.argv[3]
    
    # Get API key from environment
    api_key = os.getenv('OPENAI_API_KEY') or os.getenv('OPEN_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY or OPEN_API_KEY environment variable not set")
        sys.exit(1)
    
    print(f"\n{'='*70}")
    print(f"OpenAI RAG System - F1 Race Analysis")
    print(f"{'='*70}")
    print(f"Session: {session_key}")
    print(f"Driver: #{driver_number}")
    print(f"Action: {action}")
    print(f"{'='*70}\n")
    
    # Aggregate context
    aggregator = F1DataAggregator(session_key)
    context = aggregator.aggregate_all_context(driver_number)
    
    # Initialize analyst
    analyst = OpenAIRaceAnalyst(api_key)
    
    if action == 'summary':
        print("\nGenerating strategic summary...\n")
        summary = analyst.generate_summary(context)
        print(summary)
        
        # Output as JSON for API
        output = {
            'status': 'success',
            'type': 'summary',
            'driver_number': driver_number,
            'summary': summary,
            'timestamp': datetime.now().isoformat()
        }
        print(f"\n\n{json.dumps(output, indent=2)}")
        
    elif action == 'question':
        if len(sys.argv) < 5:
            print("Error: Question required")
            sys.exit(1)
        
        question = sys.argv[4]
        print(f"\nQuestion: {question}\n")
        print("Generating answer...\n")
        
        answer = analyst.answer_question(question, context)
        print(answer)
        
        # Output as JSON for API
        output = {
            'status': 'success',
            'type': 'question',
            'driver_number': driver_number,
            'question': question,
            'answer': answer,
            'timestamp': datetime.now().isoformat()
        }
        print(f"\n\n{json.dumps(output, indent=2)}")
    
    else:
        print(f"Error: Unknown action '{action}'")
        sys.exit(1)


if __name__ == '__main__':
    main()

