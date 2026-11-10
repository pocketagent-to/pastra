import { ChooseHandleForm } from './ChooseHandleForm';

/** A3 · Pick your name — step 1 of 3 (docs/product-spec.md section 12). */
export default function ChooseHandle() {
  return (
    <main className="app-shell flex min-h-dvh flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-ink-3">Step 1 of 3</div>
        <h1 className="font-head text-2xl font-extrabold">Pick your name</h1>
        <p className="text-sm text-ink-2">This is your pass link: [your-domain]/yourname</p>
      </div>
      <ChooseHandleForm />
    </main>
  );
}
