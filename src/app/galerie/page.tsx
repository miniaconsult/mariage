import { Gallery } from "@/components/Gallery";
import { siteConfig } from "@/config/site";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function GaleriePage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-sage-500">
            Galerie privée
          </p>
          <h1 className="mt-2 font-script text-4xl text-sage-700 sm:text-5xl">
            {siteConfig.coupleNames}
          </h1>
        </div>

        <Gallery />
      </div>
    </main>
  );
}
