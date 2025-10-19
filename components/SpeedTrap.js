import styled from "styled-components";

export const speedTrapColumns = "auto repeat(4, 110px)";

const Line = styled.li`
  display: grid;
  grid-template-columns: ${speedTrapColumns};
  align-items: center;
  padding: var(--space-3);
  border-bottom: 1px solid var(--colour-border);

  &:last-child {
    border-bottom: none;
  }
`;

const SpeedTrap = ({ racingNumber, driver, line, statsLine }) => {
  // Safety checks for missing data
  const speeds = line?.Speeds || {
    I1: { Value: 0, OverallFastest: false, PersonalFastest: false },
    I2: { Value: 0, OverallFastest: false, PersonalFastest: false },
    FL: { Value: 0, OverallFastest: false, PersonalFastest: false },
    ST: { Value: 0, OverallFastest: false, PersonalFastest: false },
  };
  
  const bestSpeeds = statsLine?.BestSpeeds || {
    I1: { Value: 0 },
    I2: { Value: 0 },
    FL: { Value: 0 },
    ST: { Value: 0 },
  };

  return (
    <Line>
      <span
        title="Driver"
        style={{
          color: driver?.TeamColour ? `#${driver.TeamColour}` : undefined,
        }}
      >
        {racingNumber} {driver?.Tla}
      </span>

      <div>
        <p>
          Lst{" "}
          <span
            style={{
              color: speeds.I1.OverallFastest
                ? "magenta"
                : speeds.I1.PersonalFastest
                ? "limegreen"
                : "var(--colour-fg)",
            }}
          >
            {speeds.I1.Value || "—"} km/h
          </span>
        </p>
        <p>
          Bst <span>{bestSpeeds.I1.Value || "—"} km/h</span>
        </p>
      </div>

      <div>
        <p>
          Lst{" "}
          <span
            style={{
              color: speeds.I2.OverallFastest
                ? "magenta"
                : speeds.I2.PersonalFastest
                ? "limegreen"
                : "var(--colour-fg)",
            }}
          >
            {speeds.I2.Value || "—"} km/h
          </span>
        </p>
        <p>
          Bst <span>{bestSpeeds.I2.Value || "—"} km/h</span>
        </p>
      </div>

      <div>
        <p>
          Lst{" "}
          <span
            style={{
              color: speeds.FL.OverallFastest
                ? "magenta"
                : speeds.FL.PersonalFastest
                ? "limegreen"
                : "var(--colour-fg)",
            }}
          >
            {speeds.FL.Value || "—"} km/h
          </span>
        </p>
        <p>
          Bst <span>{bestSpeeds.FL.Value || "—"} km/h</span>
        </p>
      </div>

      <div>
        <p>
          Lst{" "}
          <span
            style={{
              color: speeds.ST.OverallFastest
                ? "magenta"
                : speeds.ST.PersonalFastest
                ? "limegreen"
                : "var(--colour-fg)",
            }}
          >
            {speeds.ST.Value || "—"} km/h
          </span>
        </p>
        <p>
          Bst <span>{bestSpeeds.ST.Value || "—"} km/h</span>
        </p>
      </div>
    </Line>
  );
};

export default SpeedTrap;
