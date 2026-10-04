import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fluxo de Caixa',
  description: 'Gestão financeira pessoal com banco de dados estruturado',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://www.gstatic.com/charts/loader.js"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
