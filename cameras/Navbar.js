import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaHome, FaInfoCircle, FaBars, FaTimes } from 'react-icons/fa';

function Navbar({ onNavClick }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`relative w-full top-0 z-50 transition-all duration-300 ${
            isScrolled ? 'bg-black/90 backdrop-blur-md shadow-lg' : 'bg-black'
        }`}>
            <div className="container mx-auto flex justify-between items-center px-4 py-3">
                <div className="flex items-center space-x-3 group">
                    <div className="relative overflow-hidden rounded-lg">
                        <img
                            src="https://github.com/hericmr/cameras/blob/main/public/logo.png?raw=true"
                            alt="Logo"
                            className="h-8 w-8 transition-transform duration-300 group-hover:scale-110"
                            style={{ filter: "invert(1)" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <h1
                        className="text-sm sm:text-base md:text-2xl lg:text-3xl font-bold tracking-widest text-white hover:text-gray-200 transition-all duration-300"
                        style={{ fontFamily: 'Press Start 2P, sans-serif' }}
                    >
                        Câmeras de Santos ao vivo
                    </h1>
                </div>

                {/* Menu Desktop */}
                <div className="hidden md:flex items-center space-x-6">
                    <button
                        onClick={() => onNavClick('home')}
                        className="flex items-center space-x-2 text-white hover:text-gray-200 transition-all duration-200 relative group"
                    >
                        <FaHome className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                        <span className="text-sm font-medium">Home</span>
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></div>
                    </button>
                    <button
                        onClick={() => onNavClick('about')}
                        className="flex items-center space-x-2 text-white hover:text-gray-200 transition-all duration-200 relative group"
                    >
                        <FaInfoCircle className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                        <span className="text-sm font-medium">Sobre o site</span>
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></div>
                    </button>
                </div>

                {/* Botão Menu Mobile */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden text-white hover:text-gray-300 focus:outline-none transition-transform duration-200 hover:scale-105"
                    aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                    {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                </button>

                {/* Menu Mobile */}
                <div 
                    className={`md:hidden fixed inset-0 top-[57px] bg-gradient-to-b from-black/95 to-black/90 backdrop-blur-md transform transition-all duration-500 ease-in-out ${
                        isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                    }`}
                >
                    <div className="flex flex-col items-center pt-8 space-y-4 px-4">
                        <button
                            onClick={() => {
                                onNavClick('home');
                                setIsMenuOpen(false);
                            }}
                            className="w-full max-w-sm flex items-center space-x-4 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
                                <FaHome size={20} className="text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-medium text-white">Home</span>
                                <span className="text-sm text-gray-400">Voltar para página inicial</span>
                            </div>
                        </button>
                        <button
                            onClick={() => {
                                onNavClick('about');
                                setIsMenuOpen(false);
                            }}
                            className="w-full max-w-sm flex items-center space-x-4 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
                                <FaInfoCircle size={20} className="text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-medium text-white">Sobre</span>
                                <span className="text-sm text-gray-400">Informações sobre o projeto</span>
                            </div>
                        </button>
                        <div className="w-full max-w-sm h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent my-2"></div>
                        <div className="w-full max-w-sm px-4 py-3 rounded-xl bg-white/5">
                            <p className="text-sm text-center text-gray-400">
                                Câmeras de Santos © 2025
                                <br />
                                <span className="text-xs">Monitoramento em tempo real</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

Navbar.propTypes = {
    onNavClick: PropTypes.func.isRequired
};

export default Navbar;
