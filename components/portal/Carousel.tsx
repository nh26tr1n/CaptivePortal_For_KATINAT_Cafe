'use client';

import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const slides = [
  {
    image: '/images/portal/ca-phe-phin-me.png',
    eyebrow: 'posterCoffeeEyebrow',
    title: 'posterCoffeeTitle',
    imageAlt: 'posterCoffeeAlt'
  },
  {
    image: '/images/portal/tra-oolong-ba-la.png',
    eyebrow: 'posterTeaEyebrow',
    title: 'posterTeaTitle',
    imageAlt: 'posterTeaAlt'
  },
  {
    image: '/images/portal/phep-mau-giang-sinh.png',
    eyebrow: 'posterChristmasEyebrow',
    title: 'posterChristmasTitle',
    imageAlt: 'posterChristmasAlt'
  }
] as const;

export function Carousel() {
  const t = useTranslations('portal');
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 35 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectSlide = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on('select', selectSlide);
    selectSlide();
    const timer = window.setInterval(() => emblaApi.scrollNext(), 3000);

    return () => {
      window.clearInterval(timer);
      emblaApi.off('select', selectSlide);
    };
  }, [emblaApi, selectSlide]);

  const goToSlide = (index: number) => emblaApi?.scrollTo(index);

  return (
    <section aria-label={t('billboardLabel')} className="group relative h-full w-full overflow-hidden bg-[#211b18] text-[#fff4df]">
      <div className="absolute inset-0 overflow-hidden" ref={viewportRef}>
        <div className="flex h-full touch-pan-y">
          {slides.map((slide, index) => (
            <article className="relative min-w-0 flex-[0_0_100%] overflow-hidden" key={slide.image}>
              <Image
                alt={t(slide.imageAlt)}
                className="object-cover object-center"
                fill
                priority={index === 0}
                sizes="(max-width: 1023px) 100vw, 60vw"
                src={slide.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#120f0d]/75 via-[#120f0d]/5 to-[#120f0d]/20" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-6 sm:p-10 lg:p-12 xl:p-16">
                <div className="max-w-2xl">
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f4dba7] sm:text-xs">
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                    {t(slide.eyebrow)}
                  </p>
                  <h2 className="font-serif text-4xl font-medium uppercase leading-[0.98] tracking-[0.035em] drop-shadow-[0_3px_16px_rgba(0,0,0,0.3)] sm:text-5xl lg:text-6xl xl:text-7xl">
                    {t(slide.title)}
                  </h2>
                  <p className="mt-4 max-w-md text-xs leading-6 text-white/75 sm:text-sm">{t('billboardCaption')}</p>
                </div>
                <p className="hidden shrink-0 pb-1 font-serif text-sm tracking-[0.24em] text-[#f4dba7]/90 md:block">
                  KATINAT <span className="mx-2 text-white/40">/</span> SAIGON CAFE
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="absolute right-5 top-5 z-10 flex items-center gap-2 sm:right-8 sm:top-8">
        <button
          aria-label={t('previousPoster')}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-[#211b18] text-white shadow-md transition hover:bg-[#49372c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4dba7]"
          onClick={() => emblaApi?.scrollPrev()}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label={t('nextPoster')}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-[#211b18] text-white shadow-md transition hover:bg-[#49372c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4dba7]"
          onClick={() => emblaApi?.scrollNext()}
          type="button"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div aria-label={t('posterPagination')} className="absolute bottom-6 right-6 z-10 flex items-center gap-2 sm:bottom-9 sm:right-10 lg:bottom-12 lg:right-12">
        {slides.map((slide, index) => (
          <button
            aria-current={selectedIndex === index ? 'true' : undefined}
            aria-label={t('posterPosition', { current: index + 1, total: slides.length })}
            className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4dba7] ${selectedIndex === index ? 'w-8 bg-[#f4dba7]' : 'w-1.5 bg-white/65 hover:bg-white'}`}
            key={slide.image}
            onClick={() => goToSlide(index)}
            type="button"
          />
        ))}
      </div>
    </section>
  );
}
