import React from 'react';

export default function BrandAvatar({
  src = '',
  alt = '',
  fallback = 'C',
  className = '',
  imageClassName = '',
  circularImage = false,
}) {
  if (src) {
    return (
      <div
        className={className}
        style={circularImage ? { backgroundColor: 'transparent', borderColor: 'transparent' } : undefined}
      >
        <img
          src={src}
          alt={alt}
          className={imageClassName || 'h-full w-full object-contain'}
          style={circularImage ? { borderRadius: '50%' } : undefined}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <span>{fallback}</span>
    </div>
  );
}
