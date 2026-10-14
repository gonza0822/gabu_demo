import { ReactElement } from 'react';
import LoginContainer from '@/components/login/LoginContainer';
import { getSessionValue } from '@/lib/session/sessionStore';

export default async function Home() {
  const sessionMessageValue = await getSessionValue('alertMessage');

  console.log(sessionMessageValue);
  
  return (
    <main className="flex h-dvh min-h-dvh w-full items-stretch justify-center overflow-hidden overscroll-none bg-gabu-900 p-0 md:h-screen md:min-h-0 md:w-screen md:items-center">
      <LoginContainer alertMessage={sessionMessageValue} />
    </main>
  );
}
