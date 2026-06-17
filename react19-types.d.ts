import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    children?: ReactNode;
  }
  interface SVGAttributes<T> {
    children?: ReactNode;
  }
}
