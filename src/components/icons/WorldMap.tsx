import React from 'react';

export const WorldMap = () => {
    return (
        <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none overflow-hidden select-none">
            <svg
                viewBox="0 0 1000 500"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full object-cover scale-110"
            >
                <defs>
                    <radialGradient id="dotGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
                    </radialGradient>
                </defs>

                {/* Abstract World Map Dots (Simplified representation) */}
                <g className="text-primary">
                    {[...Array(40)].map((_, i) => (
                        <React.Fragment key={i}>
                            {[...Array(20)].map((_, j) => {
                                // Pseudo-random distribution that vaguely resembles continents
                                const x = i * 25 + (Math.sin(j) * 10);
                                const y = j * 25 + (Math.cos(i) * 10);
                                const size = Math.random() * 2 + 1;

                                // Only render dots that "fit" a rough map shape
                                const isLand = (
                                    (x > 100 && x < 250 && y > 100 && y < 350) || // Americas
                                    (x > 150 && x < 300 && y > 250 && y < 450) ||
                                    (x > 180 && x < 280 && y > 50 && y < 150) ||
                                    (x > 450 && x < 650 && y > 80 && y < 350) || // Eurasia/Africa
                                    (x > 480 && x < 580 && y > 200 && y < 450) ||
                                    (x > 750 && x < 900 && y > 300 && y < 450)    // Oceania
                                );

                                if (!isLand) return null;

                                return (
                                    <circle
                                        key={`${i}-${j}`}
                                        cx={x}
                                        cy={y}
                                        r={size}
                                        fill="url(#dotGradient)"
                                        className="animate-pulse"
                                        style={{ animationDelay: `${(i + j) * 100}ms`, animationDuration: '4s' }}
                                    />
                                );
                            })}
                        </React.Fragment>
                    ))}
                </g>

                {/* Connection Lines */}
                <g className="text-primary/30" stroke="currentColor" fill="none" strokeWidth="0.5">
                    <path
                        d="M200,200 Q400,100 600,200"
                        className="animate-dash"
                        style={{ strokeDasharray: '200', strokeDashoffset: '200' }}
                    />
                    <path
                        d="M220,300 Q500,250 800,350"
                        className="animate-dash"
                        style={{ strokeDasharray: '400', strokeDashoffset: '400', animationDelay: '1s' }}
                    />
                    <path
                        d="M550,150 Q700,100 850,250"
                        className="animate-dash"
                        style={{ strokeDasharray: '250', strokeDashoffset: '250', animationDelay: '2s' }}
                    />
                    <path
                        d="M500,350 Q350,400 200,320"
                        className="animate-dash"
                        style={{ strokeDasharray: '300', strokeDashoffset: '300', animationDelay: '1.5s' }}
                    />
                    <path d="M800,380 Q600,450 400,380" className="animate-dash" style={{ strokeDasharray: '250', strokeDashoffset: '250', animationDelay: '3.0s' }} />
                    <path d="M150,150 Q300,50 500,120" className="animate-dash" style={{ strokeDasharray: '200', strokeDashoffset: '200', animationDelay: '4.0s' }} />
                </g>
            </svg>

            <style >{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-dash {
          animation: dash 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
        </div>
    );
};
