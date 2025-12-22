import * as React from "react";

export function Logo({ className, ...props }) {
  return (
    <svg viewBox="0 0 22.6 24" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <title>Screenshoots</title>
      <path fill="currentColor" d="M11.3 0C5.1 0 0 5.1 0 11.3s5.1 11.3 11.3 11.3 11.3-5.1 11.3-11.3S17.5 0 11.3 0zm0 21c-5.4 0-9.7-4.3-9.7-9.7S5.9 1.6 11.3 1.6s9.7 4.3 9.7 9.7-4.3 9.7-9.7 9.7zM16.6 7.2l-7.1 7.1-4-4L4 12l5.5 5.5L18.6 8.2l-2-2z" />
    </svg>
  );
}