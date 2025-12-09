
import React, { useState } from 'react';

interface IconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  size?: number | string;
}

export function Icon({ src, fallbackSrc = '/assets/layerlab/ui/icons/Icon_Question.png', size = 32, style, ...props }: IconProps) {
  const [imgSrc, setImgSrc] = useState(src);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      onError={handleError}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        ...style,
      }}
      {...props}
    />
  );
}




