import Link from "next/link";

type EmptyStateProps = {
  icon?: string;
  title?: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const DefaultIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M8 8h8M8 12h8M8 16h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const EmptyState = ({ message, title, ctaLabel, ctaHref }: EmptyStateProps) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <DefaultIcon />
      </div>
      {title && <p className="empty-title">{title}</p>}
      <p className="empty-desc">{message}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="fd-btn fd-btn-ghost fd-btn-sm">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
