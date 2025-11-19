"use client"

import Image from "next/image"

export function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white py-6">
      <div className="mx-auto max-w-[1600px] px-6 md:px-8 lg:px-12">
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:justify-between">
          {/* 로고들 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Powered by</span>
            <img 
              src="/PENTACLE_BLACK.svg" 
              alt="Pentacle" 
              className="h-5 opacity-70 hover:opacity-100 transition-opacity"
            />
            <img 
              src="/FINFLOW_BLACK.svg" 
              alt="Finflow" 
              className="h-3 opacity-70 hover:opacity-100 transition-opacity"
            />
          </div>

          {/* 카피라이트 */}
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} FINFLOW. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

