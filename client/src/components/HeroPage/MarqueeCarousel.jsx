import React from 'react';
import carousel1 from '../../assets/carousel1.png';
import carousel2 from '../../assets/carousel2.png';
import carousel3 from '../../assets/carousel3.png';
import carousel4 from '../../assets/carousel4.png';
import carousel5 from '../../assets/carousel5.png';
import carousel6 from '../../assets/carousel6.png';
import carousel7 from '../../assets/carousel7.png';
import carousel8 from '../../assets/carousel8.png';
import carousel9 from '../../assets/carousel9.png';
import carousel10 from '../../assets/carousel10.png';
import carousel11 from '../../assets/carousel11.png';
import carousel12 from '../../assets/carousel12.png';
import carousel13 from '../../assets/carousel13.png';
import carousel14 from '../../assets/carousel14.png';
import carousel15 from '../../assets/carousel15.png';
import carousel16 from '../../assets/carousel16.png';
import carousel17 from '../../assets/carousel17.png';
import carousel18 from '../../assets/carousel18.png';
import carousel19 from '../../assets/carousel19.png';
import carousel20 from '../../assets/carousel20.png';
import carousel21 from '../../assets/carousel21.png';
import carousel22 from '../../assets/carousel22.jpg';
import carousel23 from '../../assets/carousel23.png';
import carousel24 from '../../assets/carousel24.png';
import carousel25 from '../../assets/carousel25.png';
import carousel26 from '../../assets/carousel26.png';
import carousel27 from '../../assets/carousel27.png';
import carousel28 from '../../assets/carousel28.jpg';
import carousel29 from '../../assets/carousel29.png';
import carousel30 from '../../assets/carousel30.png';

const images = [
  carousel1, carousel2, carousel3, carousel4, carousel5, carousel6, carousel7, carousel8, carousel9, carousel10,
  carousel11, carousel12, carousel13, carousel14, carousel15, carousel16, carousel17, carousel18, carousel19, carousel20,
  carousel21, carousel22, carousel23, carousel24, carousel25, carousel26, carousel27, carousel28, carousel29, carousel30,
];

const MarqueeCarousel = () => {
  const renderImages = (images) =>
    images.map((src, i) => (
      <img
        key={i}
        src={src}
        alt={`carousel image ${i + 1}`}
        className="h-28 md:h-40 w-auto rounded-xl grayscale hover:grayscale-0 transition-all duration-500 cursor-pointer object-contain px-4"
        loading="lazy"
      />
    ));

  return (
    <section className="py-12 bg-slate-900/50">
      <div className="text-center mb-8">
        <span className="text-cyan-400 font-bold tracking-widest uppercase text-sm">Our Network</span>
        <h2 className="text-3xl font-bold text-white mt-2">Admissions & Partners</h2>
      </div>

      {/* The "Fade" mask is achieved with a radial gradient or absolute divs */}
      <div className="relative overflow-hidden flex items-center bg-white/5 py-8 backdrop-blur-sm">
        <div className="animate-marquee flex items-center whitespace-nowrap min-w-full">
          {renderImages(images)}
          {renderImages(images)}
        </div>
      </div>
    </section>
  );
};

export default MarqueeCarousel;
