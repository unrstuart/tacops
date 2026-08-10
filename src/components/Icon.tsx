interface IconProps {
  src: string;
  title?: string;
}

export function Icon({ src, title }: IconProps) {
  return <img className="block h-[30px] w-auto" src={src} title={title} />;
}
