// Landing page social proof section

export const SocialProof = () => {
  const logos = [
    'EuroFoods',
    'Nordic Trade',
    'Mediterraneo',
    'Atlantic Imports',
    'German Trading',
    'Pacific Logistics',
  ];

  return (
    <section className="bg-muted/20 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center md:mb-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Trusted by exporters across Cameroon
          </p>
        </div>

        <div className="grid grid-cols-2 items-center gap-6 md:grid-cols-3 md:gap-8 lg:grid-cols-6">
          {logos.map((logo, index) => (
            <div
              key={logo}
              className="flex items-center justify-center h-12 px-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-full h-8 bg-muted-foreground/20 rounded flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground/60">
                  {logo}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center md:mt-12">
          <p className="text-sm text-muted-foreground">
            Join 50+ exporters who trust ProList for their compliance needs
          </p>
        </div>
      </div>
    </section>
  );
};