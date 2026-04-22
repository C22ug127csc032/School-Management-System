import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingAction({
  href = '#',
  label,
  variant = 'primary',
  className = '',
}) {
  const baseClassName = variant === 'secondary'
    ? `btn-secondary ${className}`.trim()
    : `btn-primary ${className}`.trim();

  if (!label) return null;

  if (String(href || '').startsWith('/')) {
    return (
      <Link to={href} className={baseClassName}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href || '#'} className={baseClassName}>
      {label}
    </a>
  );
}
