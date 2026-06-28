type SealState = "single" | "question" | "waiting" | "sealed";

export default function SealMark({
  size = 48,
  state = "single",
}: {
  size?: number;
  state?: SealState;
}) {
  const showViolet = state !== "single" && state !== "question";
  const sealed = state === "sealed";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 40"
      role="img"
      aria-label={
        sealed
          ? "Both keys present, room sealed"
          : "Waiting for the second key"
      }
    >
      <circle
        cx="24"
        cy="20"
        r="17"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2"
        opacity={0.9}
      />
      <path
        d="M24 13 a4 4 0 1 0 0.1 0 M24 17 l0 9"
        stroke="var(--gold)"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <circle
        cx="40"
        cy="20"
        r="17"
        fill="none"
        stroke="var(--violet)"
        strokeWidth="2"
        opacity={showViolet ? 0.9 : 0.25}
        strokeDasharray={showViolet ? undefined : "3 4"}
      />
      <path
        d="M40 13 a4 4 0 1 0 0.1 0 M40 17 l0 9"
        stroke="var(--violet)"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        opacity={showViolet ? 1 : 0.3}
      />
    </svg>
  );
}
