import { memo } from 'react';

function Icon({ name, className = '', fill = false, ariaHidden = true }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 300, 'GRAD' 0, 'opsz' 24` }}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  );
}

export default memo(Icon);
