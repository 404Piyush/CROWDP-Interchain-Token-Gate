'use client';

import React from 'react';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Image 
                src="/imgs/logo.png" 
                alt="CrowdPunk Logo" 
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="text-white font-bold text-lg">
                CROWDPUNK
              </span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Secure wallet connection and role verification system powered by blockchain technology.
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
              Quick Links
            </h3>
            <div className="space-y-2">
              <a href="#" className="block text-white/70 hover:text-white transition-colors duration-200 text-sm">
                Dashboard
              </a>
              <a href="#" className="block text-white/70 hover:text-white transition-colors duration-200 text-sm">
                Role System
              </a>
              <a href="#" className="block text-white/70 hover:text-white transition-colors duration-200 text-sm">
                Community
              </a>
              <a href="#" className="block text-white/70 hover:text-white transition-colors duration-200 text-sm">
                Support
              </a>
            </div>
          </div>

          {/* Technology Section */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
              Powered By
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-white/70 text-sm">Keplr Wallet</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-white/70 text-sm">Cosmos SDK</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-white/70 text-sm">Discord Integration</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-white/50 text-sm">
              © 2024 CrowdPunk. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-white/50 hover:text-white/70 transition-colors duration-200 text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-white/50 hover:text-white/70 transition-colors duration-200 text-sm">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;