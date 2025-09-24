import React from 'react';

type BentoCardProps = {
  title: string;
  description: string;
  cta?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode; // animated preview/background
  icon?: React.ReactNode;
  background?: React.ReactNode;
};

export function BentoGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"bento-grid " + className}>
      {children}
    </div>
  );
}

export function BentoCard({ title, description, cta, onClick, className, children, icon, background }: BentoCardProps) {
  return (
    <div className={"bento-card " + (className || "")} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="bento-bg">{background || children}</div>
      <div className="bento-content">
        {icon && <div className="bento-icon">{icon}</div>}
        <h3 className="bento-title">{title}</h3>
        <p className="bento-desc">{description}</p>
        {cta && <span className="bento-cta">{cta} →</span>}
      </div>
    </div>
  );
}


