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
        className="h-32 md:h-48 w-auto rounded-md"
        loading="lazy"
      />
    ));

  return (
    <section>
      <div className="text-center mb-5">
        <div className="inline-block bg-orange-600 px-6 py-2 rounded shadow mt-6">
          <h2 className="font-secondary h2 text-white text-xl">Admissions:</h2>
        </div>
      </div>

      <div className="overflow-hidden border bg-white border-gray-200 rounded-lg shadow-lg my-4 mx-4">
        <div className="animate-marquee gap-5 marquee m-10">
          {renderImages(images)}
          {renderImages(images)} {/* for seamless scroll */}
        </div>
      </div>
    </section>
  );
};

export default MarqueeCarousel;
