export default function EnvToggle() {
  const isDev = window.location.pathname.startsWith('/pikaboard-dev');
  const targetUrl = isDev ? '/pikaboard/' : '/pikaboard-dev/';
  const label = isDev ? 'DEV' : 'PROD';
  const targetLabel = isDev ? 'PROD' : 'DEV';
  
  return (
    <a
      href={targetUrl}
      className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
        isDev 
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
          : 'bg-green-100 text-green-700 hover:bg-green-200'
      }`}
      title={`Switch to ${targetLabel}`}
    >
      {label} →
    </a>
  );
}
