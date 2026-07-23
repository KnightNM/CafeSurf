import type { CSSProperties } from 'react';
import type { Cafe } from '../types';

function paletteIndex(cafe: Cafe): number {
  return cafe.name.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4;
}

export default function WorkspaceCover({
  cafe,
  large = false,
}: {
  cafe: Cafe;
  large?: boolean;
}) {
  if (cafe.cover_image_url) {
    return (
      <div className={`workspaceCover workspaceCoverPhoto ${large ? 'workspaceCoverLarge' : ''}`}>
        <img src={cafe.cover_image_url} alt={`${cafe.name} workspace`} />
        <span className="coverPhotoLabel">{cafe.area}</span>
      </div>
    );
  }

  const style = { '--cover-variant': paletteIndex(cafe) } as CSSProperties;
  return (
    <div
      className={`workspaceCover workspaceCoverAbstract coverVariant${paletteIndex(cafe)} ${large ? 'workspaceCoverLarge' : ''}`}
      style={style}
      aria-label={`${cafe.name} abstract workspace cover`}
      role="img"
    >
      <span className="coverGrid" />
      <span className="coverDesk coverDeskOne" />
      <span className="coverDesk coverDeskTwo" />
      <span className="coverSeat coverSeatOne" />
      <span className="coverSeat coverSeatTwo" />
      <span className="coverSeat coverSeatThree" />
      <span className="coverSignal">⌁</span>
      <span className="coverCode">{String(cafe.total_slots).padStart(2, '0')} seats</span>
    </div>
  );
}
