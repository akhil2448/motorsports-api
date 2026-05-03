import "../../styles/components/skeleton.css";

export default function ProfileSkeleton() {
  return (
    <div className="profile-container">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="row">
          <div className="skeleton" style={{ width: 120, height: 14 }} />
          <div className="skeleton" style={{ width: 40, height: 20 }} />
        </div>
      ))}
    </div>
  );
}
