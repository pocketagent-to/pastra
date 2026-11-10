import { Logo } from '@/components/brand/Logo';
import { ChooseHandleForm } from './ChooseHandleForm';

/** A3 · Pick your name — step 1 of 3 (docs/product-spec.md section 12). */
export default function ChooseHandle() {
  return (
    <main className="app-shell flex min-h-dvh flex-col">
      <header className="flex min-h-11 items-center gap-2.5 bg-[#16171B] px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">PASTRA</span>
      </header>

      <div className="flex flex-1 flex-col gap-[22px] px-5 pb-6 pt-7">
        <div className="flex flex-col gap-2.5">
          <span className="self-start rounded-chip bg-[linear-gradient(90deg,#3D6BFF,#6A3DFF)] px-3.5 py-2 font-head text-[11px] font-bold tracking-[0.05em] text-white">
            STEP 1 OF 3
          </span>
          <h1 className="text-gradient font-head text-[26px] font-extrabold uppercase leading-[1.2]">
            Pick your name
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-2">
            It becomes your pass address and how friends find you.
          </p>
        </div>

        <ChooseHandleForm />
      </div>
    </main>
  );
}
