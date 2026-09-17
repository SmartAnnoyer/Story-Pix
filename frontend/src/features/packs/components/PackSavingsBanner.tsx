import './PackSavingsBanner.css';

interface PackSavingsBannerProps {
  message: string;
  onSwitch: () => void;
  onIgnore: () => void;
}

export const PackSavingsBanner = ({ message, onSwitch, onIgnore }: PackSavingsBannerProps) => (
  <div className="pack-savings-banner" role="status">
    <div className="pack-savings-banner__copy">
      <span className="pack-savings-banner__eyebrow">Better deal</span>
      <p className="pack-savings-banner__text">{message}</p>
    </div>
    <div className="pack-savings-banner__actions">
      <button type="button" className="pack-savings-banner__switch" onClick={onSwitch}>
        Switch
      </button>
      <button type="button" className="pack-savings-banner__ignore" onClick={onIgnore}>
        Ignore
      </button>
    </div>
  </div>
);
