import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import moment from "moment";
import ResponsiveTable from "@monaco/components/ResponsiveTable";
import Driver, { TableHeader } from "@monaco/components/Driver";
import Radio from "@monaco/components/Radio";
import Map from "@monaco/components/Map";
import Input from "@monaco/components/Input";
import SpeedTrap, { speedTrapColumns } from "@monaco/components/SpeedTrap";
import SessionBrowser from "@monaco/components/SessionBrowser";
import PlaybackControls from "@monaco/components/PlaybackControls";
import PitLane from "@monaco/components/PitLane";
import RaceControlSidebar from "@monaco/components/RaceControlSidebar";
import MLPredictions from "@monaco/components/MLPredictions";
import StrategyFocusSelector from "@monaco/components/StrategyFocusSelector";
import StrategyCommandCenter from "@monaco/components/StrategyCommandCenter";
import OpenAIAssistant from "@monaco/components/OpenAIAssistant";
import { buildTimeline, ReplayEngine } from "@monaco/utils/replayEngine";
import sessionCache from "@monaco/utils/sessionCache";
import { fetchJSON } from "@monaco/utils/apiClient";
import { transformCompleteSession } from "@monaco/utils/openf1Transformer";

const f1Url = "https://livetiming.formula1.com";

const sortPosition = (a, b) => {
  const [, aLine] = a;
  const [, bLine] = b;
  const aPos = Number(aLine.Position);
  const bPos = Number(bLine.Position);
  return aPos - bPos;
};

const sortUtc = (a, b) => {
  const aDate = moment.utc(a.Utc);
  const bDate = moment.utc(b.Utc);
  return bDate.diff(aDate);
};

const getFlagColour = (flag) => {
  switch (flag?.toLowerCase()) {
    case "green":
      return { bg: "green" };
    case "yellow":
    case "double yellow":
      return { bg: "yellow", fg: "var(--colour-bg)" };
    case "red":
      return { bg: "red" };
    case "blue":
      return { bg: "blue" };
    default:
      return { bg: "transparent" };
  }
};

const getWeatherUnit = (key) => {
  switch (key) {
    case "AirTemp":
    case "TrackTemp":
      return "°C";
    case "Humidity":
      return "%";
    case "Pressure":
      return " mbar";
    case "WindDirection":
      return "°";
    case "WindSpeed":
      return " km/h";
    default:
      return null;
  }
};

export default function Home() {
  // Mode management
  const [mode, setMode] = useState("live"); // "live", "browser", or "replay"
  const [selectedSession, setSelectedSession] = useState(null);

  // Live mode state
  const [connected, setConnected] = useState(false);
  const [liveState, setLiveState] = useState({});
  const [updated, setUpdated] = useState(new Date());
  const [delayMs, setDelayMs] = useState(0);
  const [delayTarget, setDelayTarget] = useState(0);
  const [blocking, setBlocking] = useState(false);
  const [triggerConnection, setTriggerConnection] = useState(0);
  const [triggerTick, setTriggerTick] = useState(0);

  // Replay mode state
  const [replayEngine, setReplayEngine] = useState(null);
  const [replayState, setReplayState] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(null);
  const [loadingReplay, setLoadingReplay] = useState(false);

  // Strategy focus state
  const [focusDriver, setFocusDriver] = useState(null);
  const [compareMode, setCompareMode] = useState(false);

  // AI Assistant state
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const socket = useRef();
  const retry = useRef();
  const progressInterval = useRef();

  const initWebsocket = (handleMessage) => {
    if (retry.current) {
      clearTimeout(retry.current);
      retry.current = undefined;
    }

    const wsUrl =
      `${window.location.protocol.replace("http", "ws")}//` +
      window.location.hostname +
      (window.location.port ? `:${window.location.port}` : "") +
      "/ws";

    const ws = new WebSocket(wsUrl);

    ws.addEventListener("open", () => {
      setConnected(true);
    });

    ws.addEventListener("close", () => {
      setConnected(false);
      setBlocking((isBlocking) => {
        if (!retry.current && !isBlocking)
          retry.current = window.setTimeout(() => {
            initWebsocket(handleMessage);
          }, 1000);
      });
    });

    ws.addEventListener("error", () => {
      ws.close();
    });

    ws.addEventListener("message", ({ data }) => {
      setTimeout(() => {
        handleMessage(data);
      }, delayMs);
    });

    socket.current = ws;
  };

  // Initialize replay mode with historical data from OpenF1
  const initReplayMode = async (sessionInfo) => {
    setLoadingReplay(true);
    try {
      let data;

      const cacheKey = `openf1_${sessionInfo.sessionKey}`;

      // Check cache first and validate it has location data
      if (sessionCache.has(cacheKey)) {
        console.log("[OpenF1] Found cached session:", sessionInfo.sessionKey);
        const cachedData = sessionCache.get(cacheKey);

        // Validate cached data has location data
        if (cachedData?.Position?.Position?.length > 0) {
          console.log("[OpenF1] Cache valid with", cachedData.Position.Position.length, "position snapshots");
          data = cachedData;
        } else {
          console.warn("[OpenF1] Cache invalid (no position data), refetching...");
          sessionCache.remove(cacheKey);
              data = null;
        }
      }

      if (!data) {
        console.log("[OpenF1] Fetching session from API:", sessionInfo.sessionKey);

        // Fetch OpenF1 session data with retry logic
        // Sequential fetching with delays takes longer, so we need a longer timeout
        const responseData = await fetchJSON(
          `/api/openf1/session-data?sessionKey=${sessionInfo.sessionKey}`,
          {},
          {
            maxRetries: 2,
            timeout: 180000, // 180 second timeout (3 minutes) for OpenF1 sequential data fetching
            onRetry: (attempt, maxRetries, delay) => {
              console.log(`[OpenF1] Retry ${attempt}/${maxRetries} in ${Math.round(delay)}ms`);
            },
          }
        );

        // Transform OpenF1 data to Monaco format
        console.log("[OpenF1] Transforming data to Monaco format");
        data = transformCompleteSession(responseData.data);

        // Only cache if we have valid location data
        if (data?.Position?.Position?.length > 0) {
          console.log("[OpenF1] Caching session with", data.Position.Position.length, "position snapshots");
          sessionCache.set(cacheKey, data);
        } else {
          console.warn("[OpenF1] Not caching - insufficient position data");
        }
      } else {
        console.log("[OpenF1] Using cached data");
      }

      // Debug: Check what data we received
      console.log("Received session data keys:", Object.keys(data));
      console.log("CarData structure:", data.CarData ? {
        hasEntries: !!data.CarData.Entries,
        entriesLength: data.CarData.Entries?.length,
        firstEntryType: typeof data.CarData.Entries?.[0],
        topLevelKeys: Object.keys(data.CarData).slice(0, 10), // Show first 10 keys
        hasUtc: !!data.CarData.Utc,
        hasCars: !!data.CarData.Cars,
      } : "No CarData");
      console.log("TimingData structure:", data.TimingData ? {
        hasLines: !!data.TimingData.Lines,
        linesCount: Object.keys(data.TimingData.Lines || {}).length
      } : "No TimingData");
      console.log("PitStops structure:", data.PitStops ? {
        isArray: Array.isArray(data.PitStops),
        count: data.PitStops.length,
        firstPit: data.PitStops[0]
      } : "No PitStops");

      // If CarData exists but has unexpected structure, log the full object
      if (data.CarData && !data.CarData.Entries && !data.CarData.Cars) {
        console.warn("CarData has unexpected structure. First 100 chars:",
          JSON.stringify(data.CarData).substring(0, 100));
      }

      // Data should already be decompressed by the backend API
      // Log what we have for debugging
      if (data.CarData?.Entries) {
        console.log("✓ CarData has Entries array with", data.CarData.Entries.length, "snapshots");
        console.log("  Each snapshot will become a timeline event");
      } else if (data.CarData) {
        console.log("✓ CarData exists but has structure:", Object.keys(data.CarData).slice(0, 10));
      }

      if (data.Position?.Position) {
        console.log("✓ Position has Position array with", data.Position.Position.length, "snapshots");
        console.log("  Each snapshot will become a timeline event, then interpolated");
      } else if (data.Position) {
        console.log("✓ Position exists but has structure:", Object.keys(data.Position).slice(0, 10));
      }

      // Validate session data quality
      const positionCount = data.Position?.Position?.length || 0;

      // Check if we have enough position snapshots
      if (positionCount < 2) {
        console.error(`[Init] Insufficient position data: ${positionCount} snapshot(s). Need at least 2.`);
        alert(
          `❌ SESSION DATA INCOMPLETE\n\n` +
          `This session has insufficient position data (${positionCount} snapshot${positionCount !== 1 ? 's' : ''}).\n\n` +
          `Replays require at least 2 position snapshots with different coordinates.\n\n` +
          `This is likely placeholder/test data. Please select a different session.\n\n` +
          `✓ Races and Qualifying sessions from 2024 typically have complete data.`
        );
        setMode("browser");
        setLoadingReplay(false);
        return;
      }

      // Validate that positions actually vary (not all identical)
      if (positionCount >= 2) {
        const pos1 = data.Position.Position[0];
        const pos2 = data.Position.Position[1];

        if (pos1?.Entries && pos2?.Entries) {
          const firstDriver = Object.keys(pos1.Entries)[0];
          const coord1 = pos1.Entries[firstDriver];
          const coord2 = pos2.Entries[firstDriver];

          const distance = Math.sqrt(
            Math.pow((coord2?.X || 0) - (coord1?.X || 0), 2) +
            Math.pow((coord2?.Y || 0) - (coord1?.Y || 0), 2)
          );

          if (distance < 1) {
            console.error(`[Init] Position data contains identical coordinates. Distance=${distance.toFixed(2)}`);
            alert(
              `❌ STATIC POSITION DATA\n\n` +
              `This session has ${positionCount} position snapshots, but they all show the SAME coordinates.\n\n` +
              `This indicates placeholder/incomplete data with no actual car movement.\n\n` +
              `Please select a different session (preferably a 2024 Race or Qualifying).`
            );
            setMode("browser");
            setLoadingReplay(false);
            return;
          }

          // Warn if we have very few snapshots
          if (positionCount < 10) {
            console.warn(`[Init] Limited position data: ${positionCount} snapshots. Replay may be choppy.`);
          }
        }
      }

      // Build timeline from data with user-selected interpolation quality
      const quality = sessionInfo.interpolationQuality || 'HIGH';
      console.log(`[Init] Building timeline with ${quality} quality interpolation`);

      const timeline = buildTimeline(data, {
        interpolate: positionCount >= 2, // Only interpolate if we have enough data
        quality, // User-selected: 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'
      });

      // Create replay engine with real-time playback
      // timeCompression: 1 means 1x speed = real-time
      // User can then adjust with speed controls (0.5x, 1x, 2x, 5x, 10x)
      const engine = new ReplayEngine(timeline, {
        playbackSpeed: 1,
        timeCompression: 1, // 1x = real-time (user can speed up with controls)
        onStateUpdate: (state) => {
          setReplayState(state);
          setUpdated(new Date());
        },
      });

      setReplayEngine(engine);
      setReplayState(engine.state);
      setSelectedSession(sessionInfo);
      setMode("replay");
      setIsPlaying(false); // Start paused - user must press play

      console.log("[Init] Replay loaded. Press ▶ to start playback.");

      // Notify server about mode change
      if (socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ type: "setMode", mode: "replay" }));
      }
    } catch (error) {
      console.error("Error initializing replay mode:", error);
      alert(`Failed to load session: ${error.message}`);
      setMode("browser");
    } finally {
      setLoadingReplay(false);
    }
  };

  // Replay control handlers
  const handlePlay = () => {
    if (replayEngine) {
      replayEngine.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (replayEngine) {
      replayEngine.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (percentage) => {
    if (replayEngine) {
      replayEngine.seek(percentage);
      setProgress(percentage);
    }
  };

  const handleSpeedChange = (speed) => {
    if (replayEngine) {
      replayEngine.setSpeed(speed);
      setPlaybackSpeed(speed);
    }
  };

  const handleReset = () => {
    if (replayEngine) {
      replayEngine.reset();
      setProgress(0);
      setIsPlaying(false);
      setReplayState(replayEngine.state);
    }
  };

  const handleExitReplay = () => {
    if (replayEngine) {
      replayEngine.destroy();
      setReplayEngine(null);
    }
    setMode("live");
    setSelectedSession(null);
    setReplayState({});
    setIsPlaying(false);
    setProgress(0);

    // Notify server about mode change
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: "setMode", mode: "live" }));
    }
  };

  // Update progress periodically when playing
  useEffect(() => {
    if (isPlaying && replayEngine) {
      progressInterval.current = setInterval(() => {
        setProgress(replayEngine.getProgress());
        setCurrentTime(replayEngine.getCurrentTime());
      }, 100);
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, replayEngine]);

  // Cleanup replay engine when component unmounts or mode changes
  useEffect(() => {
    return () => {
      if (replayEngine) {
        console.log("[Init] Cleaning up replay engine on unmount");
        replayEngine.destroy();
      }
    };
  }, [mode]); // Cleanup when mode changes

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/worker.js");
    }
  }, []);

  useEffect(() => {
    setLiveState({});
    setBlocking(false);
    initWebsocket((data) => {
      try {
        const d = JSON.parse(data);
        setLiveState(d);
        setUpdated(new Date());
      } catch (e) {
        console.error(`could not process message: ${e}`);
      }
    });
  }, [triggerConnection]);

  useEffect(() => {
    if (blocking) {
      socket.current?.close();
      setTimeout(() => {
        setTriggerConnection((n) => n + 1);
      }, 100);
    }
  }, [blocking]);

  useEffect(() => {
    let interval;
    if (Date.now() < delayTarget) {
      interval = setInterval(() => {
        setTriggerTick((n) => n + 1);
        if (Date.now() >= delayTarget) clearInterval(interval);
      }, 250);
    }
  }, [delayTarget]);

  const messageCount =
    Object.values(liveState?.RaceControlMessages?.Messages ?? []).length +
    Object.values(liveState?.TeamRadio?.Captures ?? []).length;
  useEffect(() => {
    if (messageCount > 0) {
      try {
        new Audio("/notif.mp3").play();
      } catch (e) {}
    }
  }, [messageCount]);

  // Show session browser in browser mode
  if (mode === "browser") {
    return (
      <>
        <Head>
          <title>Session Browser - Monaco</title>
        </Head>
        <main>
          <SessionBrowser
            onSelectSession={initReplayMode}
            onBack={() => setMode("live")}
          />
        </main>
      </>
    );
  }

  // Show loading state for replay
  if (loadingReplay) {
    return (
      <>
        <Head>
          <title>Loading Session...</title>
        </Head>
        <main>
          <div
            style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ marginBottom: "var(--space-4)" }}>
              <strong>LOADING SESSION...</strong>
            </p>
            <p>Please wait while we load the historical data</p>
          </div>
        </main>
      </>
    );
  }

  if (!connected && mode === "live")
    return (
      <>
        <Head>
          <title>No connection</title>
        </Head>
        <main>
          <div
            style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ marginBottom: "var(--space-4)" }}>
              <strong>NO CONNECTION</strong>
            </p>
            <button onClick={() => window.location.reload()} style={{ marginBottom: "var(--space-2)" }}>
              RELOAD
            </button>
            <button onClick={() => setMode("browser")}>
              BROWSE HISTORICAL SESSIONS
            </button>
          </div>
        </main>
      </>
    );

  if (Date.now() < delayTarget)
    return (
      <>
        <Head>
          <title>Syncing</title>
        </Head>
        <main>
          <div
            style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ marginBottom: "var(--space-4)" }}>
              <strong>SYNCING...</strong>
            </p>
            <p>{(delayTarget - Date.now()) / 1000} sec</p>
          </div>
        </main>
      </>
    );

  // Use appropriate state based on mode
  const currentState = mode === "replay" ? replayState : liveState;

  const {
    Heartbeat,
    SessionInfo,
    TrackStatus,
    LapCount,
    ExtrapolatedClock,
    WeatherData,
    DriverList,
    SessionData,
    RaceControlMessages,
    TimingData,
    TimingAppData,
    TimingStats,
    CarData,
    Position,
    TeamRadio,
    PitStops,
  } = currentState;


  if (!Heartbeat && mode === "live")
    return (
      <>
        <Head>
          <title>No session</title>
        </Head>
        <main>
          <div
            style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ marginBottom: "var(--space-4)" }}>
              <strong>NO SESSION</strong>
            </p>
            <p style={{ marginBottom: "var(--space-4)" }}>
              Come back later when there is a live session
            </p>
            <button onClick={() => setMode("browser")}>
              BROWSE HISTORICAL SESSIONS
            </button>
          </div>
        </main>
      </>
    );

  const extrapolatedTimeRemaining =
    ExtrapolatedClock.Utc && ExtrapolatedClock.Remaining
      ? ExtrapolatedClock.Extrapolating
        ? moment
            .utc(
              Math.max(
                moment
                  .duration(ExtrapolatedClock.Remaining)
                  .subtract(
                    moment.utc().diff(moment.utc(ExtrapolatedClock.Utc))
                  )
                  .asMilliseconds() + delayMs,
                0
              )
            )
            .format("HH:mm:ss")
        : ExtrapolatedClock.Remaining
      : undefined;

  return (
    <>
      <Head>
        <title>
          {SessionInfo.Meeting.Circuit.ShortName}: {SessionInfo.Name}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "var(--space-3)",
              borderBottom: "1px solid var(--colour-border)",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              {!!SessionInfo && (
                <>
                  <p style={{ marginRight: "var(--space-4)" }}>
                    <strong>{SessionInfo.Meeting.OfficialName}</strong>,{" "}
                    {SessionInfo.Meeting.Circuit.ShortName},{" "}
                    {SessionInfo.Meeting.Country.Name}
                  </p>
                  <p style={{ marginRight: "var(--space-4)" }}>
                    Session: {SessionInfo.Name}
                  </p>
                </>
              )}
              {!!TrackStatus && (
                <p style={{ marginRight: "var(--space-4)" }}>
                  Status: {TrackStatus.Message}
                </p>
              )}
              {!!LapCount && (
                <p style={{ marginRight: "var(--space-4)" }}>
                  Lap: {LapCount.CurrentLap}/{LapCount.TotalLaps}
                </p>
              )}
              {!!extrapolatedTimeRemaining && (
                <p style={{ marginRight: "var(--space-4)" }}>
                  Remaining: {extrapolatedTimeRemaining}
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <p style={{ marginRight: "var(--space-4)" }}>
                Data updated: {moment.utc(updated).format("HH:mm:ss.SSS")} UTC
              </p>

              {/* AI Assistant Button */}
              <button
                onClick={() => setAiModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #e10600 0%, #ff0000 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginRight: 'var(--space-4)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(225, 6, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(225, 6, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(225, 6, 0, 0.3)';
                }}
                title="Ask AI Race Strategist"
              >
                🤖 Ask AI
              </button>
              {mode === "live" ? (
                <>
                  <p style={{ color: "limegreen", marginRight: "var(--space-4)" }}>
                    ● LIVE
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.target);
                      const delayMsValue = Number(form.get("delayMs"));
                      setBlocking(true);
                      setDelayMs(delayMsValue);
                      setDelayTarget(Date.now() + delayMsValue);
                    }}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <p style={{ marginRight: "var(--space-2)" }}>Delay</p>
                    <Input
                      type="number"
                      name="delayMs"
                      defaultValue={delayMs}
                      style={{ width: "75px", marginRight: "var(--space-2)" }}
                    />
                    <p style={{ marginRight: "var(--space-4)" }}>ms</p>
                  </form>
                  <button
                    onClick={() => setMode("browser")}
                    style={{ marginRight: "var(--space-4)" }}
                  >
                    📚 BROWSE HISTORY
                  </button>
                </>
              ) : (
                <p style={{ color: "orange", marginRight: "var(--space-4)" }}>
                  ⏯ REPLAY MODE
                </p>
              )}
              <a
                href="https://github.com/tdjsnelling/monaco"
                target="_blank"
                style={{ color: "grey" }}
              >
                tdjsnelling/monaco
              </a>
            </div>
          </div>

          {!!WeatherData && (
            <div
              style={{
                display: "flex",
                padding: "var(--space-3)",
                borderBottom: "1px solid var(--colour-border)",
                overflowX: "auto",
              }}
            >
              <p style={{ marginRight: "var(--space-4)" }}>
                <strong>WEATHER</strong>
              </p>
              {Object.entries(WeatherData).map(([k, v]) =>
                k !== "_kf" ? (
                  <p
                    key={`weather-${k}`}
                    style={{ marginRight: "var(--space-4)" }}
                  >
                    {k}: {v}
                    {getWeatherUnit(k)}
                  </p>
                ) : null
              )}
            </div>
          )}
        </>

          <ResponsiveTable
          cols="1.5fr 1fr"
            style={{
            borderBottom: "1px solid var(--colour-border)",
          }}
        >
          {/* TRACK with overlaid sidebars */}
          <div style={{
                          borderRight: "1px solid var(--colour-border)",
            position: "relative", // For absolutely positioned sidebars
          }}>
            <div
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--colour-offset)",
              }}
            >
              <p>
                <strong>TRACK</strong>
              </p>
            </div>

            {/* Strategy Focus Selector - driver selection above track */}
            {mode === "replay" && DriverList && (
              <StrategyFocusSelector
                driverList={DriverList}
                selectedDriver={focusDriver}
                onDriverSelect={setFocusDriver}
                compareMode={compareMode}
                onCompareModeToggle={() => setCompareMode(!compareMode)}
              />
            )}

            {!!Position ? (
              (() => {
                const positionToRender = Position.Position?.[Position.Position.length - 1];

                // Debug: Log what we're rendering every 2 seconds
                if (mode === "replay" && positionToRender && Math.random() < 0.05) {
                  const firstDriver = Object.keys(positionToRender.Entries || {})[0];
                  const coords = positionToRender.Entries?.[firstDriver];
                  console.log(`[UI] Rendering position for Map: Driver ${firstDriver} at X=${coords?.X?.toFixed(0)}, Y=${coords?.Y?.toFixed(0)}, Position buffer length=${Position.Position?.length}`);
                }

                return (
                  <div style={{
                    transform: 'scale(0.85)',
                    transformOrigin: 'top left',
                    width: '117.6%', // Compensate for scale to prevent layout shift
                  }}>
                  <Map
                    circuit={SessionInfo.Meeting.Circuit.Key}
                    Position={positionToRender}
                    DriverList={DriverList}
                    TimingData={TimingData}
                    TrackStatus={TrackStatus}
                    WindDirection={WeatherData.WindDirection}
                  />
                  </div>
                );
              })()

            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "400px",
                }}
              >
                <p>NO DATA YET</p>
              </div>
            )}

            {/* Race Control Sidebar - shows race control messages */}
            {RaceControlMessages && (
              <RaceControlSidebar
                raceControlMessages={RaceControlMessages}
                sessionData={SessionData}
              />
            )}

            {/* Pit Lane Sidebar - shows cars currently in the pit */}
            {mode === "replay" && PitStops && (
              <PitLane
                pitStops={PitStops}
                driverList={DriverList}
                currentTime={currentTime}
              />
            )}

            {/* ML Predictions Sidebar - Monte Carlo simulations */}
            {mode === "replay" && SessionInfo && (
              <MLPredictions
                sessionData={SessionInfo}
                driverList={DriverList}
                timingData={TimingData}
              />
            )}

            {/* Strategy Command Center - HPC-powered driver-specific strategies */}
            {mode === "replay" && focusDriver && !compareMode && (
              <StrategyCommandCenter
                focusDriver={focusDriver}
                driverList={DriverList}
                timingData={TimingData}
                sessionData={SessionInfo}
              />
            )}
          </div>

          {/* TEAM RADIO (moved from 3rd to 2nd column) */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--colour-offset)",
              }}
            >
              <p>
                <strong>TEAM RADIO</strong>
              </p>
            </div>
            {!!TeamRadio ? (
              <ul
                style={{
                  listStyle: "none",
                  height: "200px",
                  overflow: "auto",
                  flexGrow: 1,
                }}
              >
                {[...Object.values(TeamRadio.Captures).sort(sortUtc)].map(
                  (radio, i) => {
                    const driver = DriverList[radio.RacingNumber];
                    return (
                      <Radio
                        key={`team-radio-${radio.Utc}-${i}`}
                        radio={radio}
                        path={`${f1Url}/static/${SessionInfo.Path}${radio.Path}`}
                        driver={driver}
                      />
                    );
                  }
                )}
              </ul>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <p>NO DATA YET</p>
              </div>
            )}
          </div>
        </ResponsiveTable>

        <div>
            <div
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--colour-offset)",
              }}
            >
              <p>
              <strong>LIVE TIMING DATA</strong>
              </p>
            </div>
          <ResponsiveTable
                style={{
              gridTemplateColumns: !TimingData ? "1fr" : undefined,
            }}
          >
            {!!TimingData ? (
              <>
                {(() => {
                  const lines = Object.entries(TimingData.Lines).sort(
                    sortPosition
                  );
                    return (
                    <>
                      <div
                        style={{
                          borderRight: "1px solid var(--colour-border)",
                        }}
                      >
                        <TableHeader />
                        {lines.slice(0, 10).map(([racingNumber, line]) => {
                          // Only render if we have CarData, or show simplified version
                          if (!CarData || !CarData.Entries || CarData.Entries.length === 0) {
                            return (
                              <div key={`timing-data-${racingNumber}`}
                                style={{
                                  padding: "var(--space-3)",
                                  borderBottom: "1px solid var(--colour-border)"
                                }}>
                                <p>P{line.Position} - {DriverList?.[racingNumber]?.Tla || racingNumber}</p>
                              </div>
                            );
                          }
                          return (
                            <Driver
                              key={`timing-data-${racingNumber}`}
                              racingNumber={racingNumber}
                              line={line}
                              DriverList={DriverList}
                              CarData={CarData}
                              TimingAppData={TimingAppData}
                              TimingStats={TimingStats}
                            />
                          );
                        })}
                      </div>
                      <div>
                        <TableHeader />
                        {lines
                          .slice(10, 20)
                          .map(([racingNumber, line], pos) => {
                            // Only render if we have CarData, or show simplified version
                            if (!CarData || !CarData.Entries || CarData.Entries.length === 0) {
                              return (
                                <div key={`timing-data-${racingNumber}`}
                                  style={{
                                    padding: "var(--space-3)",
                                    borderBottom: "1px solid var(--colour-border)"
                                  }}>
                                  <p>P{line.Position} - {DriverList?.[racingNumber]?.Tla || racingNumber}</p>
                                </div>
                              );
                            }
                            return (
                              <Driver
                                key={`timing-data-${racingNumber}`}
                                racingNumber={racingNumber}
                                line={line}
                                DriverList={DriverList}
                                CarData={CarData}
                                TimingAppData={TimingAppData}
                                TimingStats={TimingStats}
                              />
                            );
                          })}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "var(--space-4)",
                }}
              >
                <p style={{ marginBottom: "var(--space-3)" }}><strong>NO TIMING DATA AVAILABLE</strong></p>
                <p style={{ fontSize: "11px", color: "grey" }}>
                  {!TimingData && "Missing TimingData. "}
                  {!CarData && "Missing CarData. "}
                  {CarData && (!CarData.Entries || CarData.Entries.length === 0) && "CarData has no entries. "}
                </p>
                <p style={{ fontSize: "11px", color: "grey", marginTop: "var(--space-2)" }}>
                  Check browser console for details
                </p>
              </div>
            )}
        </ResponsiveTable>
        </div>

        <ResponsiveTable
          style={{
            borderBottom: "1px solid var(--colour-border)",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid var(--colour-border)",
            }}
          >
            <div
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--colour-offset)",
                borderBottom: "1px solid var(--colour-border)",
              }}
            >
              <p>
                <strong>SPEED TRAP DATA</strong>
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: speedTrapColumns,
                padding: "var(--space-2) 24px var(--space-2) var(--space-3)",
                backgroundColor: "var(--colour-offset)",
              }}
            >
              <p>DRIVER</p>
              <p>SECTOR 1</p>
              <p>SECTOR 2</p>
              <p>FINISH LINE</p>
              <p>SPEED TRAP</p>
            </div>
            {!!TimingData && !!DriverList && (
              <ul
                style={{
                  listStyle: "none",
                  height: "200px",
                  overflow: "auto",
                  flexGrow: 1,
                }}
              >
                {Object.entries(TimingData.Lines)
                  .sort(sortPosition)
                  .map(([racingNumber, line]) => (
                    <SpeedTrap
                      key={`speed-trap-${racingNumber}`}
                      racingNumber={racingNumber}
                      driver={DriverList[racingNumber]}
                      line={line}
                      statsLine={TimingStats.Lines[racingNumber]}
                    />
                  ))}
              </ul>
            )}
          </div>
        </ResponsiveTable>

        <p
          style={{ color: "grey", padding: "var(--space-3)", fontSize: "11px", marginBottom: mode === "replay" ? "120px" : "0" }}
        >
          f1.tdjs.dev is not associated in any way with Formula 1 or any other
          Formula 1 companies. All data displayed is publicly available and used
          in a non-commercial, fair use setting. Map data provided by
          api.multiviewer.app.
        </p>
      </main>

      {mode === "replay" && (
        <PlaybackControls
          isPlaying={isPlaying}
          progress={progress}
          currentTime={currentTime}
          playbackSpeed={playbackSpeed}
          sessionInfo={selectedSession}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onSpeedChange={handleSpeedChange}
          onReset={handleReset}
          onExit={handleExitReplay}
        />
      )}

      {/* AI Assistant Modal */}
      <OpenAIAssistant
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        sessionKey={mode === "replay" ? selectedSession?.sessionKey : SessionInfo?.session_key}
        driverNumber={focusDriver || 1}
        driverName={DriverList?.[focusDriver || 1]?.BroadcastName}
        raceData={{
          sessionData: mode === "replay" ? selectedSession : SessionInfo,
          timingData: TimingData,
          driverList: DriverList,
          currentLap: LapCount?.CurrentLap,
          weatherData: WeatherData,
          positionData: Position,
          trackStatus: TrackStatus,
          sessionKey: mode === "replay" ? selectedSession?.sessionKey : SessionInfo?.session_key,
          driverNumber: focusDriver || 1
        }}
      />
    </>
  );
}