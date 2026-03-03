import { ReactElement } from 'react';
import LoginContainer from '@/components/login/LoginContainer';
import { getSessionValue } from '@/lib/session/sessionStore';

export default async function Home() {
  const sessionMessageValue = await getSessionValue('alertMessage');

  console.log(sessionMessageValue);
  
  return (
    <main className="h-screen w-screen bg-gabu-900 flex justify-center items-center">
      <LoginContainer alertMessage={sessionMessageValue} />
    </main>
  );
}
