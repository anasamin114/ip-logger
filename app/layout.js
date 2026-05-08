import './globals.css';

export const metadata = {
  title: 'IP Information · Security Check',
  description: 'View your public IP address and geolocation information',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
