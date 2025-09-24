import React from 'react';

type ShineBorderProps = {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export default function ShineBorder({ className, style, children }: ShineBorderProps) {
  const mergedClassName = className ? 'shine-wrap ' + className : 'shine-wrap';
  return (
    <div className={mergedClassName} style={style}>
      {children}
    </div>
  );
}


