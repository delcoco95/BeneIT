'use strict';

/**
 * Formulaires de demande (accueil et fin de diagnostic) : <form data-lead-form data-source="...">.
 * Pour le diagnostic, wizard.js renseigne form.dataset.auditId une fois le bilan calcule.
 *
 * Accessibilite :
 *  - chaque champ invalide recoit aria-invalid + un message precis relie par aria-describedby (3.3.1, 3.3.3) ;
 *  - un resume role="alert" liste les erreurs avec des liens vers les champs ;
 *  - le succes est annonce dans .form-status (role="status", present en permanence dans le DOM).
 */
(function () {
  let uid = 0;

  function messageFor(field) {
    const v = field.validity;
    const name = field.name;
    if (v.valueMissing) {
      if (name === 'consent') return 'Cochez la case pour accepter l’utilisation de vos informations.';
      if (name === 'name') return 'Saisissez votre nom.';
      if (name === 'email') return 'Saisissez votre adresse e-mail.';
      if (name === 'need') return 'Choisissez votre besoin dans la liste.';
      return 'Ce champ est obligatoire.';
    }
    if (v.typeMismatch && field.type === 'email') {
      return 'Saisissez une adresse e-mail valide, par exemple nom@domaine.fr.';
    }
    if (v.tooShort) {
      return 'Saisissez au moins ' + field.minLength + ' caractères (' + field.value.length + ' actuellement).';
    }
    if (v.tooLong) {
      return 'Ce champ ne peut pas dépasser ' + field.maxLength + ' caractères.';
    }
    return 'La valeur saisie n’est pas valide.';
  }

  function labelFor(field) {
    if (field.name === 'consent') return 'Consentement';
    const lab = field.id ? field.form.querySelector('label[for="' + field.id + '"]') : null;
    if (!lab) return field.name;
    // Texte du libelle sans la mention "(facultatif)".
    const clone = lab.cloneNode(true);
    clone.querySelectorAll('.opt').forEach((n) => n.remove());
    return clone.textContent.trim();
  }

  function clearErrors(form, summary) {
    form.querySelectorAll('.field-error').forEach((n) => n.remove());
    form.querySelectorAll('[aria-invalid]').forEach((f) => {
      f.removeAttribute('aria-invalid');
      f.removeAttribute('aria-describedby');
    });
    summary.textContent = '';
    summary.className = 'form-status error full';
  }

  function showSummary(summary, intro, items) {
    summary.textContent = '';
    summary.className = 'form-status error full show';
    const p = document.createElement('p');
    p.textContent = intro;
    summary.appendChild(p);
    if (items && items.length) {
      const ul = document.createElement('ul');
      items.forEach((it) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + it.field.id;
        a.textContent = it.label;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          it.field.focus();
        });
        li.appendChild(a);
        li.appendChild(document.createTextNode(' : ' + it.message));
        ul.appendChild(li);
      });
      summary.appendChild(ul);
    }
  }

  function setStatus(el, text, link) {
    el.className = 'form-status show success';
    el.textContent = text;
    if (link) {
      el.appendChild(document.createTextNode(' '));
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      a.setAttribute('download', '');
      el.appendChild(a);
    }
    el.focus();
  }

  function bind(form) {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('[type="submit"]');
    const submitLabel = submit.textContent;

    // Resume d'erreurs : role="alert", present (vide) des le chargement pour etre annonce de facon fiable.
    const summary = document.createElement('div');
    summary.className = 'form-status error full';
    summary.setAttribute('role', 'alert');
    form.insertBefore(summary, form.firstChild);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form, summary);
      status.className = 'form-status';
      status.textContent = '';

      // Validation native du navigateur (required, type=email, minlength...), avec nos propres messages.
      const invalid = Array.from(form.elements).filter(
        (f) => f.willValidate && f.name !== 'website' && !f.validity.valid
      );
      if (invalid.length) {
        const items = invalid.map((field) => {
          if (!field.id) field.id = 'f-' + (++uid);
          const message = messageFor(field);
          const err = document.createElement('p');
          err.className = 'field-error' + (field.name === 'consent' ? ' full' : '');
          err.id = 'err-' + field.id;
          err.textContent = message;
          const holder = field.closest('.field');
          if (holder) holder.appendChild(err);
          else (field.closest('label') || field).insertAdjacentElement('afterend', err);
          field.setAttribute('aria-invalid', 'true');
          field.setAttribute('aria-describedby', err.id);
          return { field, label: labelFor(field), message };
        });
        showSummary(
          summary,
          invalid.length === 1
            ? 'Le formulaire contient 1 erreur à corriger :'
            : 'Le formulaire contient ' + invalid.length + ' erreurs à corriger :',
          items
        );
        invalid[0].focus();
        return;
      }

      const data = new FormData(form);
      const payload = {
        source: form.dataset.source,
        need: data.get('need') || undefined,
        name: data.get('name') || '',
        company: data.get('company') || '',
        email: data.get('email') || '',
        phone: data.get('phone') || '',
        message: data.get('message') || '',
        auditId: form.dataset.auditId || undefined,
        consent: data.get('consent') === 'on',
        website: data.get('website') || '',
      };

      submit.disabled = true;
      submit.textContent = 'Envoi…';
      submit.setAttribute('aria-busy', 'true');
      let done = false;
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showSummary(summary, body.error || 'Envoi impossible. Réessayez dans un instant.');
          return;
        }
        done = true;
        form.querySelectorAll('input:not([type=hidden]):not([type=checkbox]), textarea').forEach((f) => { f.value = ''; });
        if (body.downloadUrl) {
          submit.textContent = 'Rapport prêt ✓';
          setStatus(status, 'Votre rapport est prêt.', { href: body.downloadUrl, label: 'Télécharger le PDF' });
          return;
        }
        submit.textContent = 'Demande envoyée ✓';
        setStatus(status, 'Merci, votre demande est bien reçue. Je vous réponds sous 24 h ouvrées.');
      } catch {
        showSummary(summary, 'Impossible de joindre le serveur. Vérifiez votre connexion.');
      } finally {
        submit.removeAttribute('aria-busy');
        if (!done) {
          submit.disabled = false;
          submit.textContent = submitLabel;
          // Le bouton desactive avait perdu le focus : on le lui rend.
          submit.focus();
        }
      }
    });
  }

  document.querySelectorAll('form[data-lead-form]').forEach(bind);

  // Liens "Demander un bilan", etc. : preselectionne le besoin dans le formulaire de contact.
  document.querySelectorAll('a[data-need]').forEach((link) => {
    link.addEventListener('click', () => {
      const select = document.querySelector('#contact select[name="need"]');
      if (select) select.value = link.dataset.need;
    });
  });
})();
