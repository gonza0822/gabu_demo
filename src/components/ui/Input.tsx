import { ReactElement } from "react";

export default function Input({
  label,
  hasLabel = true,
  isLogin,
  disabled = false,
  type = "text",
  ref,
  isError,
  errorMessage,
  defaultValue,
  value,
  handleInput,
  variant = 'default',
  placeholder,
}: {
  label: string,
  hasLabel?: boolean,
  isLogin: boolean,
  disabled: boolean,
  type : string,
  ref?: React.Ref<HTMLInputElement>,
  isError: boolean,
  errorMessage: string | null,
  defaultValue?: string,
  value?: string,
  handleInput?: (event: React.FormEvent<HTMLInputElement>) => void,
  variant?: 'default' | 'columnFilter' | 'abm',
  placeholder?: string,
}) : ReactElement {
    const isColumnFilter = variant === 'columnFilter';
    const isAbm = variant === 'abm';
    const labelClass = hasLabel
      ? isColumnFilter
        ? 'text-gabu-100 text-sm font-normal'
        : isAbm
        ? 'text-gabu-100 text-xs font-normal'
        : 'text-gabu-900 text-lg'
      : '';
    const InputStyle = isColumnFilter
      ? `border border-gabu-300 bg-gabu-100 text-gabu-900 rounded-md py-0.5 pl-3 pr-2 w-full outline-none focus:outline-none focus:ring-0 ${disabled && 'bg-gabu-300'}`
      : isAbm
      ? `bg-gabu-100 rounded-md font-normal px-3 text-gabu-700 w-full outline-none focus:outline-none focus:ring-0 ${disabled && 'bg-gabu-300'}`
      : `${isLogin ? 'border-l-10 border-2' : 'border'} ${isError ? 'border-gabu-error' : 'border-gabu-900 focus:border-gabu-500'} text-gabu-900 rounded-md py-2 pl-3 pr-2 w-full outline-none focus:outline-none focus:ring-0 ${disabled && 'bg-gabu-300'}`;

    return (
      <div className="flex flex-col gap-1 relative">
          {hasLabel && <label className={labelClass}>{label}</label>}
          <input type={type} className={InputStyle} disabled={disabled} ref={ref} onInput={handleInput} autoComplete="off" {...(value !== undefined ? { value } : { defaultValue })} placeholder={placeholder}/>
          {isError && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] flex z-30">
              <div className="relative bg-gabu-error rounded-lg px-3 py-2 shadow-sm">
                <span
                  className="absolute left-3 -top-1.5 w-0 h-0"
                  style={{
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '6px solid var(--color-gabu-error)',
                  }}
                  aria-hidden
                />
                <p className="text-gabu-100 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}
      </div>
    );
}