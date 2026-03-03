import { motion } from 'motion/react';
import React from 'react';
import styled from 'styled-components';

export default function Loader({msg} : {msg: string}) : React.ReactElement {
  return (
    <motion.div className="fixed inset-0 flex items-center justify-center" key="loader" initial={{opacity: 0, y:200}} animate={{opacity: 1, y:0}} exit={{opacity: 0, y:200, transition: { type: "tween", duration: 0.6, ease:"easeInOut"}}} transition={{type: "spring", bounce: 0.7, duration: 0.6, ease: "easeInOut"}}>
      <div className='flex flex-col items-center'>
          <StyledWrapper>
          <div className="newtons-cradle">
              <div className="newtons-cradle__dot" />
              <div className="newtons-cradle__dot" />
              <div className="newtons-cradle__dot" />
              <div className="newtons-cradle__dot" />
          </div>
          </StyledWrapper>
          <div className='flex justify-center align-middle'>
              <p className='text-gabu-100 font-semibold'>{msg}</p>
          </div>
      </div>
    </motion.div>
  );
}

const StyledWrapper = styled.div`
  .newtons-cradle {
   --uib-size: 80px;
   --uib-speed: 1.2s;
   --uib-color: var(--color-gabu-100);
   position: relative;
   display: flex;
   align-items: center;
   justify-content: center;
   width: var(--uib-size);
   height: var(--uib-size);
  }

  .newtons-cradle__dot {
   position: relative;
   display: flex;
   align-items: center;
   height: 100%;
   width: 25%;
   transform-origin: center top;
  }

  .newtons-cradle__dot::after {
   content: '';
   display: block;
   width: 100%;
   height: 25%;
   border-radius: 50%;
   background-color: var(--uib-color);
  }

  .newtons-cradle__dot:first-child {
   animation: swing var(--uib-speed) linear infinite;
  }

  .newtons-cradle__dot:last-child {
   animation: swing2 var(--uib-speed) linear infinite;
  }

  @keyframes swing {
   0% {
    transform: rotate(0deg);
    animation-timing-function: ease-out;
   }

   25% {
    transform: rotate(70deg);
    animation-timing-function: ease-in;
   }

   50% {
    transform: rotate(0deg);
    animation-timing-function: linear;
   }
  }

  @keyframes swing2 {
   0% {
    transform: rotate(0deg);
    animation-timing-function: linear;
   }

   50% {
    transform: rotate(0deg);
    animation-timing-function: ease-out;
   }

   75% {
    transform: rotate(-70deg);
    animation-timing-function: ease-in;
   }
  }`;
