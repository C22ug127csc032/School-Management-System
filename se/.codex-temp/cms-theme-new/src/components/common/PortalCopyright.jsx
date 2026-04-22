import React from 'react';

const copyByVariant = {
  full: '\u00A9 All Rights Reserved. Powered by EMATIX Embedded and Software Solutions Inc.',
  powered: 'Powered by EMATIX Embedded and Software Solutions Inc.',
};

export default function PortalCopyright({
  className = '',
  textClassName = '',
  variant = 'full',
}) {
  return (
    <p className={`text-center text-base leading-8 text-text-secondary ${className}`.trim()}>
      <span className={textClassName}>
        {copyByVariant[variant] || copyByVariant.full}
      </span>
    </p>
  );
}
