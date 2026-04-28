const Loading = () => {
  return (
    <div className="page-container">
      <div className="skeleton-header">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-btn" />
      </div>
      <div className="dash-grid-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-line-lg" />
            <div className="skeleton skeleton-line-sm" />
            <div
              className="skeleton skeleton-line-sm"
              style={{ width: "40%" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Loading;
