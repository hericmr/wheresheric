// Footer.js
import React from 'react';
import { FaGithub, FaLinkedin, FaEnvelope, FaCode } from 'react-icons/fa';

function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 py-8 mt-8 border-t border-gray-800">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* About Section */}
                    <div className="flex flex-col items-center md:items-start">
                        <h3 className="text-white font-semibold mb-3">Sobre o Projeto</h3>
                        <p className="text-sm text-gray-400 text-center md:text-left">
                            Sistema de monitoramento de câmeras de Santos em tempo real.
                            Desenvolvido com React e tecnologias modernas.
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-white font-semibold mb-3">Links</h3>
                        <div className="flex space-x-4">
                            <a
                                href="https://github.com/hericmr"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors duration-200"
                                aria-label="GitHub"
                            >
                                <FaGithub size={24} />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors duration-200"
                                aria-label="LinkedIn"
                            >
                                <FaLinkedin size={24} />
                            </a>
                            <a
                                href="mailto:contato@exemplo.com"
                                className="text-gray-400 hover:text-white transition-colors duration-200"
                                aria-label="Email"
                            >
                                <FaEnvelope size={24} />
                            </a>
                        </div>
                    </div>

                    {/* Credits Section */}
                    <div className="flex flex-col items-center md:items-end">
                        <h3 className="text-white font-semibold mb-3">Desenvolvido por</h3>
                        <div className="flex items-center space-x-2">
                            <FaCode className="text-gray-400" />
                            <span className="text-sm">hericmr</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            &copy; {new Date().getFullYear()} Cameras de Santos
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
