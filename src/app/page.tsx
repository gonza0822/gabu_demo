import { ReactElement } from 'react';
import LoginContainer from '@/components/login/LoginContainer';

export default function Home() : ReactElement {
  let options: string[];

  return (
    <main className="h-screen w-screen bg-gabu-900 flex justify-center items-center">
      <LoginContainer/>
    </main>
  );
}
