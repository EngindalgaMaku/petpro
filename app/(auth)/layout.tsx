import { AuthFeatures, AuthShowcase } from "@/components/auth-showcase";
import { BrandMark } from "@/components/brand";
import { PetFaces } from "@/components/pet-art";

// Wide screens: what PetPro does on the left, the form on the right.
// Phones and tablets in portrait: the brand, the form, and the main points below it.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-12">
      <div className="hidden lg:col-span-7 lg:block">
        <AuthShowcase />
      </div>
      <div className="flex min-h-dvh flex-col px-4 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))] sm:px-8 lg:col-span-5 lg:justify-center lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
            <div>
              <BrandMark />
              <p className="mt-2 text-sm text-muted">Pet kuaförleri için</p>
            </div>
            <PetFaces className="h-16 shrink-0" />
          </div>
          {children}
          <AuthFeatures />
        </div>
      </div>
    </div>
  );
}
