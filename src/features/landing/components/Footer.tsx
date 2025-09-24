// Landing page footer component

import { Link } from 'react-router-dom';

export const Footer = () => {
  const footerLinks = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Documentation', href: '#docs' },
        { label: 'API Reference', href: '#api' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' },
        { label: 'Blog', href: '#blog' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', href: '#terms' },
        { label: 'Privacy Policy', href: '#privacy' },
        { label: 'Cookie Policy', href: '#cookies' },
      ],
    },
  ];

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="py-12 md:py-16">
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-5">
            {/* Brand */}
            <div className="text-center sm:text-left lg:col-span-2">
              <Link to="/" className="mb-4 inline-flex items-center justify-center sm:justify-start">
                <span className="text-xl font-bold text-primary">ProList</span>
              </Link>
              <p className="mx-auto mb-4 max-w-md text-muted-foreground sm:mx-0">
                Automated export compliance for modern businesses.
                Generate documents, ensure compliance, stay audit-ready.
              </p>
              <p className="text-sm text-muted-foreground">
                Made for Cameroon exporters, built for the world.
              </p>
            </div>

            {/* Links */}
            {footerLinks.map((section) => (
              <div key={section.title} className="text-center sm:text-left">
                <h3 className="mb-4 font-semibold text-foreground">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="py-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 ProList. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Status
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};