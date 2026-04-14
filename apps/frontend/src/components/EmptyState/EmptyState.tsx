import Link from "next/link";

type EmptyStateProps = {
  icon: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const EmptyState = ({ icon, message, ctaLabel, ctaHref }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <span className="text-5xl">{icon}</span>
      <p className="text-lg text-gray-500">{message}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn btn-primary rounded-field">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
