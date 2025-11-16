import { ReactElement } from "react";

export default function Input({
  label,
  isLogin,
  disabled = false,
  type = "text",
  ref,
  isError,
  errorMessage,
  handleInput,
}: {
  label: string,
  isLogin: boolean,
  disabled: boolean,
  type : string,
  ref: React.Ref<HTMLInputElement>,
  isError: boolean,
  errorMessage: string | null,
  handleInput?: (event: React.FormEvent<HTMLInputElement>) => void,
}) : ReactElement {
    const InputStyle = `border-2 ${isLogin && 'border-l-10'} ${isError ? 'border-gabu-error' : 'border-gabu-900 focus:border-gabu-500'} text-gabu-900 rounded-md py-2 pl-3 pr-2 w-full outline-none focus:outline-none focus:ring-0 outline-none focus:outline-none focus:ring-0 ${disabled && 'bg-gabu-300'}`;

    return (
      <div className="flex flex-col gap-1 relative">
          <label className="text-gabu-900 text-lg">{label}</label>
          <input type={type} className={InputStyle} disabled={disabled} ref={ref} onInput={handleInput} autoComplete="off"/>
          {isError && (
            <div className="absolute bg-gabu-error top-[calc(100%+6px)] right-0 rounded-lg flex flex-col">
              <span className="absolute -top-1.5 start-5 w-4 h-4 bg-gabu-error rotate-45 rounded-sm"></span>
              <p className="p-1 px-3 text-gabu-100 text-sm">{errorMessage}</p>
            </div>
          )}
      </div>
    );
}