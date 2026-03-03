document.querySelectorAll('.navbar').forEach((navbar) => {
    const toggleButton = navbar.querySelector('.nav-toggle');
    const navLinks = navbar.querySelector('.nav-links');

    if (!toggleButton || !navLinks) {
        return;
    }

    const closeMenu = () => {
        navLinks.classList.remove('is-open');
        toggleButton.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        navLinks.classList.add('is-open');
        toggleButton.setAttribute('aria-expanded', 'true');
    };

    toggleButton.addEventListener('click', () => {
        const isOpen = navLinks.classList.contains('is-open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 720) {
            closeMenu();
        }
    });
});

const stickyHeader = document.querySelector('.site-header');

const getAnchorOffset = () => {
    const headerHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
    return headerHeight + 8;
};

const scrollToHashTarget = (hashValue, behavior = 'smooth') => {
    if (!hashValue || !hashValue.startsWith('#') || hashValue.length <= 1) {
        return;
    }

    const targetId = decodeURIComponent(hashValue.slice(1));
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
        return;
    }

    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY - getAnchorOffset();
    window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior
    });
};

document.querySelectorAll('a[href^="#"]').forEach((anchorLink) => {
    anchorLink.addEventListener('click', (event) => {
        const hash = anchorLink.getAttribute('href');
        if (!hash || hash === '#') {
            return;
        }

        const targetId = decodeURIComponent(hash.slice(1));
        const targetElement = targetId ? document.getElementById(targetId) : null;
        if (!targetElement) {
            return;
        }

        event.preventDefault();
        history.pushState(null, '', hash);
        scrollToHashTarget(hash, 'smooth');
    });
});

window.addEventListener('hashchange', () => {
    scrollToHashTarget(window.location.hash, 'auto');
});

if (window.location.hash) {
    window.addEventListener('load', () => {
        scrollToHashTarget(window.location.hash, 'auto');
    });
}

document.querySelectorAll('.site-header .nav-links').forEach((navLinks) => {
    const navItems = Array.from(
        navLinks.querySelectorAll(':scope > a[href], :scope > .nav-dropdown > .nav-dropdown-trigger[href]')
    );

    if (!navItems.length) {
        return;
    }

    const getFileFromPath = (pathName) => {
        const cleanPath = pathName.split('?')[0].split('#')[0];
        const lastPart = cleanPath.split('/').pop();
        return lastPart || 'index.html';
    };

    const currentFile = getFileFromPath(window.location.pathname);
    const isIndexPage = currentFile === 'index.html';

    const setActiveLink = (activeLink) => {
        navItems.forEach((item) => {
            item.classList.toggle('is-active', item === activeLink);
        });
    };

    if (!isIndexPage) {
        const pageLink = navItems.find((item) => {
            const targetUrl = new URL(item.getAttribute('href'), window.location.href);
            const targetFile = getFileFromPath(targetUrl.pathname);
            return targetFile === currentFile;
        });

        if (pageLink) {
            setActiveLink(pageLink);
        }

        return;
    }

    const sectionNavItems = navItems
        .map((item) => {
            const hrefValue = item.getAttribute('href') || '';
            const targetUrl = new URL(hrefValue, window.location.href);
            const targetFile = getFileFromPath(targetUrl.pathname);

            if (targetFile !== 'index.html' || !targetUrl.hash) {
                return null;
            }

            const sectionId = targetUrl.hash.slice(1);
            const sectionElement = document.getElementById(sectionId);

            if (!sectionElement) {
                return null;
            }

            return {
                item,
                sectionElement
            };
        })
        .filter(Boolean);

    if (!sectionNavItems.length) {
        return;
    }

    const updateActiveByScroll = () => {
        const offset = (document.querySelector('.site-header')?.offsetHeight || 0) + 110;
        let activeSection = sectionNavItems[0];

        sectionNavItems.forEach((entry) => {
            if (window.scrollY + offset >= entry.sectionElement.offsetTop) {
                activeSection = entry;
            }
        });

        if (activeSection) {
            setActiveLink(activeSection.item);
        }
    };

    window.addEventListener('scroll', updateActiveByScroll, { passive: true });
    window.addEventListener('hashchange', updateActiveByScroll);
    updateActiveByScroll();
});

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = carousel.querySelectorAll('[data-carousel-slide]');
    const prevButton = carousel.querySelector('[data-carousel-prev]');
    const nextButton = carousel.querySelector('[data-carousel-next]');
    const dotsContainer = carousel.parentElement.querySelector('[data-carousel-dots]');
    const dots = dotsContainer ? dotsContainer.querySelectorAll('[data-carousel-dot]') : [];

    if (!track || !slides.length || !prevButton || !nextButton) {
        return;
    }

    let currentIndex = 0;

    const updateCarousel = (index) => {
        currentIndex = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('is-active', slideIndex === currentIndex);
        });

        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === currentIndex;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    };

    prevButton.addEventListener('click', () => {
        updateCarousel(currentIndex - 1);
    });

    nextButton.addEventListener('click', () => {
        updateCarousel(currentIndex + 1);
    });

    dots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', () => {
            updateCarousel(dotIndex);
        });
    });

    updateCarousel(0);
});

document.querySelectorAll('[data-participa]').forEach((participaSection) => {
    const optionButtons = participaSection.querySelectorAll('[data-participa-option]');
    const contentPanels = participaSection.querySelectorAll('[data-participa-content]');

    if (!optionButtons.length || !contentPanels.length) {
        return;
    }

    const setActiveOption = (targetOption) => {
        optionButtons.forEach((button) => {
            const isActive = button.dataset.participaOption === targetOption;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        contentPanels.forEach((panel) => {
            const isActive = panel.dataset.participaContent === targetOption;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;
        });
    };

    optionButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setActiveOption(button.dataset.participaOption);
        });
    });

    setActiveOption(optionButtons[0].dataset.participaOption);
});

const mailTriggerButton = document.querySelector('[data-mail-trigger]');
const mailOptionsPanel = document.querySelector('[data-mail-options]');
const mailProviderButtons = document.querySelectorAll('[data-email-provider]');

if (mailTriggerButton && mailOptionsPanel && mailProviderButtons.length) {
    const recipient = 'awala@awalacolombia.org';
    const subject = 'Postulación - Trabaja con Awala';
    const body = [
        'Título: Postulación para vacante en Awala',
        '',
        'Hola equipo Awala,',
        '',
        'Adjunto mi hoja de vida para participar en sus convocatorias laborales.',
        '',
        'Nombre completo:',
        'Teléfono:',
        'Ciudad:',
        'Perfil profesional:',
        '',
        'Gracias por su atención.'
    ].join('\n');

    const buildMailUrlByProvider = (provider) => {
        const to = encodeURIComponent(recipient);
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(body);

        if (provider === 'gmail') {
            return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodedSubject}&body=${encodedBody}`;
        }

        if (provider === 'outlook' || provider === 'hotmail') {
            return `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${encodedSubject}&body=${encodedBody}`;
        }

        if (provider === 'yahoo') {
            return `https://compose.mail.yahoo.com/?to=${to}&subject=${encodedSubject}&body=${encodedBody}`;
        }

        return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    };

    const setMailOptionsVisibility = (isVisible) => {
        mailOptionsPanel.hidden = !isVisible;
        mailTriggerButton.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
    };

    mailTriggerButton.addEventListener('click', () => {
        const willShow = mailOptionsPanel.hidden;
        setMailOptionsVisibility(willShow);
    });

    mailProviderButtons.forEach((providerButton) => {
        providerButton.addEventListener('click', () => {
            const provider = providerButton.dataset.emailProvider;
            const mailUrl = buildMailUrlByProvider(provider);
            window.location.href = mailUrl;
        });
    });

    document.querySelectorAll('[data-participa-option]').forEach((button) => {
        button.addEventListener('click', () => {
            setMailOptionsVisibility(false);
        });
    });
}

const contactTypeSelect = document.querySelector('#tipo-contacto');
const contactMessageField = document.querySelector('#mensaje');

if (contactTypeSelect && contactMessageField) {
    const queryParams = new URLSearchParams(window.location.search);
    const selectedInterest = queryParams.get('interes');
    const allowedInterests = ['aliado', 'voluntario', 'sugerencia', 'equipo'];

    const messageTemplates = {
        aliado: 'Hola AWALA, me interesa ser aliado/a de su organización. Quisiera conocer los requisitos y próximos pasos para iniciar una alianza.',
        voluntario: 'Hola AWALA, me interesa participar como voluntario/a. Quisiera recibir información sobre perfiles, disponibilidad y proceso de vinculación.',
        sugerencia: 'Hola AWALA, quiero compartir una sugerencia para fortalecer sus iniciativas y el trabajo con la comunidad:',
        equipo: 'Hola AWALA, me interesa unirme al equipo. Les comparto mi nombre y correo para que puedan contactarme.'
    };

    let lastAutoMessage = '';

    const setBaseMessage = (interest) => {
        const template = messageTemplates[interest] || '';
        const currentValue = contactMessageField.value.trim();
        const canReplace = !currentValue || currentValue === lastAutoMessage;

        if (template && canReplace) {
            contactMessageField.value = template;
            lastAutoMessage = template;
        }
    };

    contactTypeSelect.addEventListener('change', () => {
        setBaseMessage(contactTypeSelect.value);
    });

    if (selectedInterest && allowedInterests.includes(selectedInterest)) {
        contactTypeSelect.value = selectedInterest;
        setBaseMessage(selectedInterest);
    }
}

const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    const nameInput = contactForm.querySelector('#nombre');
    const emailInput = contactForm.querySelector('#correo');
    const interestInput = contactForm.querySelector('#tipo-contacto');
    const messageInput = contactForm.querySelector('#mensaje');
    const submitButton = contactForm.querySelector('button[type="submit"]');

    if (nameInput && emailInput && interestInput && messageInput && submitButton) {
        let statusElement = contactForm.querySelector('.contact-form-status');

        if (!statusElement) {
            statusElement = document.createElement('p');
            statusElement.className = 'contact-form-status';
            statusElement.setAttribute('aria-live', 'polite');
            contactForm.append(statusElement);
        }

        const setFormStatus = (message, statusType) => {
            statusElement.textContent = message;
            statusElement.classList.remove('is-success', 'is-error', 'is-loading');

            if (statusType) {
                statusElement.classList.add(statusType);
            }
        };

        const formspreeEndpoint = (contactForm.dataset.formspreeEndpoint || '').trim();
        const isValidFormspreeEndpoint = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(formspreeEndpoint);
        const hasPlaceholderEndpoint = formspreeEndpoint.includes('TU_FORM_ID');

        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                setFormStatus('Por favor completa todos los campos requeridos.', 'is-error');
                return;
            }

            if (!isValidFormspreeEndpoint || hasPlaceholderEndpoint) {
                setFormStatus('Falta configurar Formspree.', 'is-error');
                return;
            }

            const selectedInterestLabel = interestInput.options[interestInput.selectedIndex]?.text || interestInput.value;
            const formData = {
                email: emailInput.value.trim(),
                message: messageInput.value.trim(),
                nombre: nameInput.value.trim(),
                correo: emailInput.value.trim(),
                interes: selectedInterestLabel,
                mensaje: messageInput.value.trim(),
                _subject: `Nuevo mensaje de contacto - ${selectedInterestLabel}`
            };

            submitButton.disabled = true;
            setFormStatus('Enviando mensaje...', 'is-loading');

            try {
                const response = await fetch(formspreeEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok) {
                    const detail = result?.errors?.[0]?.message || 'No se pudo enviar el formulario.';
                    throw new Error(detail);
                }

                setFormStatus('Mensaje enviado correctamente. Revisa también tu correo para confirmar el envío.', 'is-success');
                contactForm.reset();
            } catch (error) {
                setFormStatus(`Hubo un error: ${error.message}`, 'is-error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }
}

const donationForm = document.querySelector('[data-donation-form]');

if (donationForm) {
    const frequencyButtons = donationForm.querySelectorAll('[data-frequency-option]');
    const amountButtons = donationForm.querySelectorAll('[data-amount-option]');
    const frequencyInput = donationForm.querySelector('#frecuencia');
    const amountInput = donationForm.querySelector('#monto');
    const destinationSelect = donationForm.querySelector('[data-donation-destination]');
    const customAmountWrap = donationForm.querySelector('[data-custom-amount-wrap]');
    const customAmountInput = donationForm.querySelector('#custom-amount');
    const submitButton = donationForm.querySelector('.donation-submit');

    const summaryFrequency = document.querySelector('[data-donation-summary-frequency]');
    const summaryAmount = document.querySelector('[data-donation-summary-amount]');
    const summaryDestination = document.querySelector('[data-donation-summary-destination]');
    const donationEndpoint = (donationForm.dataset.donationEndpoint || '/api/wompi/checkout-data').trim();
    const transactionEndpoint = (donationForm.dataset.donationTransactionEndpoint || '/api/wompi/transactions').trim();

    let statusElement = donationForm.querySelector('.donation-form-status');

    if (!statusElement) {
        statusElement = document.createElement('p');
        statusElement.className = 'donation-form-status';
        statusElement.setAttribute('aria-live', 'polite');
        donationForm.append(statusElement);
    }

    const frequencyLabels = {
        unica: 'Única',
        mensual: 'Mensual'
    };

    const destinationLabels = {
        educacion: 'Educación y niñez',
        mujeres: 'Programas para mujeres',
        territorio: 'Desarrollo territorial y comunitario',
        general: 'Fondo general Awala'
    };

    const formatMoney = (value) => {
        const amount = Number(value) || 0;
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const setDonationStatus = (message, statusType) => {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        statusElement.classList.remove('is-success', 'is-error', 'is-loading');

        if (statusType) {
            statusElement.classList.add(statusType);
        }
    };

    const ensureWompiWidgetLoaded = () => {
        if (typeof window.WidgetCheckout === 'function') {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector('script[data-wompi-widget]');

            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(), { once: true });
                existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar el widget de Wompi.')), {
                    once: true
                });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.wompi.co/widget.js';
            script.async = true;
            script.dataset.wompiWidget = 'true';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('No se pudo cargar el widget de Wompi.'));
            document.head.append(script);
        });
    };

    const statusMessages = {
        APPROVED: '¡Gracias! Tu donación fue aprobada correctamente.',
        DECLINED: 'La transacción fue rechazada. Puedes intentar con otro medio de pago.',
        VOIDED: 'La transacción fue anulada.',
        ERROR: 'Ocurrió un error durante el pago. Intenta nuevamente.',
        PENDING: 'Tu pago está pendiente de confirmación por Wompi.'
    };

    const normalizeTransactionStatus = (status) => {
        const normalizedStatus = String(status || '').toUpperCase();
        const message = statusMessages[normalizedStatus] || 'Estamos validando el estado de tu donación.';
        const typeClass = normalizedStatus === 'APPROVED'
            ? 'is-success'
            : normalizedStatus === 'PENDING'
                ? 'is-loading'
                : 'is-error';

        return { normalizedStatus, message, typeClass };
    };

    const fetchTransactionStatus = async (transactionId) => {
        const response = await fetch(`${transactionEndpoint}/${encodeURIComponent(transactionId)}`);
        const payload = await response.json();

        if (!response.ok) {
            const detail = payload?.message || 'No fue posible validar el estado de la transacción.';
            throw new Error(detail);
        }

        return payload;
    };

    const updateSummary = () => {
        const frequencyValue = frequencyInput ? frequencyInput.value : 'unica';
        const amountValue = amountInput ? amountInput.value : '0';
        const destinationValue = destinationSelect ? destinationSelect.value : 'educacion';

        if (summaryFrequency) {
            summaryFrequency.textContent = frequencyLabels[frequencyValue] || 'Única';
        }

        if (summaryAmount) {
            summaryAmount.textContent = formatMoney(amountValue);
        }

        if (summaryDestination) {
            summaryDestination.textContent = destinationLabels[destinationValue] || 'Educación y niñez';
        }
    };

    frequencyButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.dataset.frequencyOption;

            frequencyButtons.forEach((item) => item.classList.remove('is-active'));
            button.classList.add('is-active');

            if (frequencyInput && value) {
                frequencyInput.value = value;
            }

            updateSummary();
        });
    });

    amountButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.dataset.amountOption;

            amountButtons.forEach((item) => item.classList.remove('is-active'));
            button.classList.add('is-active');

            if (value === 'custom') {
                if (customAmountWrap) {
                    customAmountWrap.hidden = false;
                }

                if (customAmountInput) {
                    customAmountInput.focus();
                    const customValue = Number(customAmountInput.value);
                    if (amountInput) {
                        amountInput.value = customValue > 0 ? String(customValue) : '5000';
                    }
                }
            } else {
                if (customAmountWrap) {
                    customAmountWrap.hidden = true;
                }

                if (amountInput && value) {
                    amountInput.value = value;
                }
            }

            updateSummary();
        });
    });

    if (customAmountInput) {
        customAmountInput.addEventListener('input', () => {
            const customValue = Number(customAmountInput.value);
            if (amountInput) {
                amountInput.value = customValue > 0 ? String(customValue) : '0';
            }
            updateSummary();
        });
    }

    if (destinationSelect) {
        destinationSelect.addEventListener('change', updateSummary);
    }

    donationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!donationForm.checkValidity()) {
            donationForm.reportValidity();
            setDonationStatus('Por favor completa todos los campos requeridos.', 'is-error');
            return;
        }

        const amountValue = Number(amountInput?.value || 0);

        if (!Number.isFinite(amountValue) || amountValue < 5000) {
            setDonationStatus('El monto mínimo para donar es $5.000 COP.', 'is-error');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        setDonationStatus('Preparando checkout seguro con Wompi...', 'is-loading');

        try {
            const payload = {
                amount: amountValue,
                frequency: frequencyInput?.value || 'unica',
                destination: destinationSelect?.value || 'general',
                donorName: donationForm.querySelector('#donante-nombre')?.value?.trim() || '',
                donorEmail: donationForm.querySelector('#donante-correo')?.value?.trim() || ''
            };

            const response = await fetch(donationEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                const detail = result?.message || 'No fue posible iniciar la donación.';
                throw new Error(detail);
            }

            const checkoutConfig = result?.checkout;

            if (!checkoutConfig) {
                throw new Error('No se recibió configuración de checkout desde el servidor.');
            }

            await ensureWompiWidgetLoaded();

            if (typeof window.WidgetCheckout !== 'function') {
                throw new Error('El widget de Wompi no está disponible en este navegador.');
            }

            setDonationStatus('Se abrió Wompi. Completa el pago para finalizar tu donación.', 'is-loading');

            const checkout = new window.WidgetCheckout(checkoutConfig);

            checkout.open(async (checkoutResult) => {
                try {
                    const transactionData = checkoutResult?.transaction;

                    if (!transactionData?.id) {
                        setDonationStatus('No se completó el pago. Puedes intentarlo nuevamente.', 'is-error');
                        return;
                    }

                    const backendStatus = await fetchTransactionStatus(transactionData.id);
                    const { message, typeClass } = normalizeTransactionStatus(backendStatus?.status);
                    setDonationStatus(message, typeClass);
                } catch (error) {
                    setDonationStatus(`No se pudo confirmar el pago: ${error.message}`, 'is-error');
                }
            });
        } catch (error) {
            setDonationStatus(`No se pudo iniciar la donación: ${error.message}`, 'is-error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });

    updateSummary();
}

document.querySelectorAll('[data-no-open-calls]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
        window.alert('No hay convocatorias abiertas');
    });
});
