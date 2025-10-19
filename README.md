## What it does

PitStopComet bridges HPC computing with real-time F1 decision-making by processing historical and live telemetry at up to 5x race speed to deliver instant, interpretable strategy insights. 

### Core Capabilities

**High-Performance Computing Engine**
- Runs 100,000+ parallel Monte Carlo simulations across multi-core infrastructure
- Processes entire race datasets at 5x real-time speed using distributed computing
- Leverages CPU parallelization to deliver sub-second predictions during live races

**Intelligent Strategy Translation**
- Transforms complex tire degradation models, fuel calculations, and position forecasts into simple actionable commands
- Provides explainable confidence scores for every recommendation (e.g., "PIT NOW - 87% confidence")
- Generates win condition probabilities and lap-by-lap position gain/loss scenarios

**Real-Time Decision Interface**
- Intuitive dashboard displays AI-powered pit timing alerts, optimal strategy windows, and track heatmaps
- Integrated chatbot answers critical questions instantly (e.g., "Should we pit now?" or "What's our undercut window?")
- Designed for race managers coordinating split-second decisions with drivers at the wheel

**Historical Analysis & Insights**
- Archives entire race datasets with telemetry including car coordinates (X, Y, Z), speed profiles, throttle/brake inputs, and pit status
- Performs intensive Bayesian learning computations to extract competitor trends and performance patterns
- Surfaces optimal pit windows, tire strategy comparisons, and tactical opportunities that would take analysts hours to uncover manually

### Target Users

- **Race Engineers**: Real-time strategy recommendations during live races
- **Race Managers**: Clear, defensible decisions for driver communication
- **Strategy Analysts**: Historical data mining for competitor analysis and future race preparation
- **F1 Enthusiasts**: Deep insights into race dynamics and team strategies

When scaled, PitStopComet ensures that petabytes of F1 data become clear, defensible decisions when milliseconds matter most.

## Challenges We Faced

**Latency vs. Accuracy Tradeoff**
- Running 100,000+ simulations while maintaining sub-second response times required aggressive optimization of our Monte Carlo engine
- Solved by implementing multiprocessing pools and strategic caching of tire degradation models

**Interpretability of Complex Models**
- Raw simulation outputs were too complex for split-second decision-making
- Built an Explainable AI layer that ranks decision factors by impact score and translates probabilistic outputs into confidence-scored actions

**Real-Time Data Integration**
- OpenF1 API rate limits and data freshness posed challenges for live race scenarios
- Implemented intelligent caching with Bayesian updating to refine predictions as new telemetry arrives without re-running full simulations

**Scalability Across Hardware**
- Monte Carlo performance varied drastically between development machines
- Designed adaptive parallelization that automatically detects available CPU cores and distributes workload accordingly

## What We Learned

**HPC Fundamentals in Practice**
- Gained hands-on experience with parallel computing architectures, discovering that doubling CPU cores doesn't linearly double performance due to communication overhead
- Learned to profile bottlenecks using timing metrics and optimize critical paths in simulation loops

**Domain-Specific Model Design**
- Deep-dived into F1 race physics including tire degradation curves, fuel load impacts (0.03s per kg), and pit stop time loss calculations
- Understood that accurate modeling requires balancing physical realism with computational efficiency

**Human-Centered AI Design**
- Realized that powerful algorithms mean nothing if engineers can't interpret results under race pressure
- Learned to design for explainability first, using ranked factor lists and natural language summaries instead of raw probability distributions

**Real-Time System Architecture**
- Discovered the importance of progressive updates and confidence intervals when working with streaming data
- Implemented Bayesian inference to continuously refine predictions without discarding prior simulations, making the system smarter as races progress
