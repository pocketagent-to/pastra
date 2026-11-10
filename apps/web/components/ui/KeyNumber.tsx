import { GradientText } from './GradientText';

/** One "Your numbers" row: a big gradient value and its label. */
export function KeyNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <GradientText className="text-2xl font-extrabold">{value}</GradientText>
      <span className="text-sm text-ink-2">{label}</span>
    </div>
  );
}
