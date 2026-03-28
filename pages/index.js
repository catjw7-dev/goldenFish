import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  return (
    <>
      <Head><title>🐟 Golden Fish Game</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: '2rem' }}>
        <div className="float" style={{ fontSize: 72 }}>🐟</div>
        <h1 className="orb g-gold flicker" style={{ fontSize: 'clamp(28px,7vw,52px)', fontWeight: 900, letterSpacing: '.06em', textAlign: 'center' }}>
          GOLDEN FISH
        </h1>
        <p className="orb g-cyan" style={{ fontSize: 13, letterSpacing: '.18em' }}>QUIZ SURVIVAL GAME</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          <button className="btn btn-cyan btn-lg" onClick={() => router.push('/room/1')}>서버 1 입장</button>
          <button className="btn btn-gold btn-lg" onClick={() => router.push('/room/2')}>서버 2 입장</button>
        </div>
      </div>
    </>
  );
}
