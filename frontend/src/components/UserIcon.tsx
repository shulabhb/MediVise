
type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  title?: string;
};

export default function UserIcon({ size = 20, color = '#0a0a0a', strokeWidth = 1.8, title = 'User' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={title} focusable="false">
      <title>{title}</title>
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth={strokeWidth} />
      <path d="M4 20c0-4.418 3.582-6 8-6s8 1.582 8 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}


