/**
 * Add Trade Form Handler
 * Handles form submission and saves trade to IndexedDB
 * Triggers the trade pipeline after successful save
 */

(function() {
  'use strict';

  /**
   * Initialize form handler when DOM is ready
   */
  function initAddTradeForm() {
    const form = document.getElementById('trade-form');
    if (!form) {
      console.warn('[AddTrade] Trade form not found');
      return;
    }

    console.log('[AddTrade] Initializing add trade form...');

    // Auto-calculate P&L and other metrics on input
    setupAutoCalculations();

    // Setup tag displays
    setupTagDisplays();

    // Setup file preview
    setupFilePreview();

    // Handle form submission
    form.addEventListener('submit', handleFormSubmit);

    console.log('[AddTrade] Form initialized');
  }

  /**
   * Setup auto-calculations for P&L, time in trade, risk:reward
   */
  function setupAutoCalculations() {
    const fields = [
      'entry_price', 'exit_price', 'position_size', 'direction',
      'stop_loss', 'target_price',
      'entry_date', 'entry_time', 'exit_date', 'exit_time'
    ];

    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', updateCalculations);
        field.addEventListener('change', updateCalculations);
      }
    });
  }

  /**
   * Update calculated fields
   */
  function updateCalculations() {
    const entryPrice = parseFloat(document.getElementById('entry_price').value) || 0;
    const exitPrice = parseFloat(document.getElementById('exit_price').value) || 0;
    const positionSize = parseFloat(document.getElementById('position_size').value) || 0;
    const direction = document.getElementById('direction').value;
    const stopLoss = parseFloat(document.getElementById('stop_loss').value) || 0;
    const targetPrice = parseFloat(document.getElementById('target_price').value) || 0;

    // Calculate P&L (USD)
    let pnlUSD = 0;
    if (direction === 'LONG') {
      pnlUSD = (exitPrice - entryPrice) * positionSize;
    } else if (direction === 'SHORT') {
      pnlUSD = (entryPrice - exitPrice) * positionSize;
    }

    // Calculate P&L (%)
    let pnlPercent = 0;
    if (entryPrice > 0) {
      if (direction === 'LONG') {
        pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
      } else if (direction === 'SHORT') {
        pnlPercent = ((entryPrice - exitPrice) / entryPrice) * 100;
      }
    }

    // Calculate Risk:Reward
    let riskReward = 0;
    if (direction === 'LONG' && stopLoss > 0) {
      const risk = entryPrice - stopLoss;
      const reward = targetPrice - entryPrice;
      riskReward = risk > 0 ? reward / risk : 0;
    } else if (direction === 'SHORT' && stopLoss > 0) {
      const risk = stopLoss - entryPrice;
      const reward = entryPrice - targetPrice;
      riskReward = risk > 0 ? reward / risk : 0;
    }

    // Calculate Time in Trade
    const entryDate = document.getElementById('entry_date').value;
    const entryTime = document.getElementById('entry_time').value;
    const exitDate = document.getElementById('exit_date').value;
    const exitTime = document.getElementById('exit_time').value;

    let timeInTrade = '0h 0m';
    if (entryDate && entryTime && exitDate && exitTime) {
      const entry = new Date(`${entryDate}T${entryTime}`);
      const exit = new Date(`${exitDate}T${exitTime}`);
      const diffMs = exit - entry;
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      timeInTrade = `${hours}h ${mins}m`;
    }

    // Update displays
    const pnlUSDElem = document.getElementById('calc-pnl-usd');
    const pnlPercentElem = document.getElementById('calc-pnl-percent');
    const timeInTradeElem = document.getElementById('calc-time-in-trade');
    const riskRewardElem = document.getElementById('calc-risk-reward');

    if (pnlUSDElem) {
      pnlUSDElem.textContent = `${pnlUSD >= 0 ? '+' : ''}$${pnlUSD.toFixed(2)}`;
      pnlUSDElem.style.color = pnlUSD >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    if (pnlPercentElem) {
      pnlPercentElem.textContent = `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`;
      pnlPercentElem.style.color = pnlPercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    if (timeInTradeElem) {
      timeInTradeElem.textContent = timeInTrade;
    }

    if (riskRewardElem) {
      riskRewardElem.textContent = `1:${riskReward.toFixed(2)}`;
    }
  }

  /**
   * Setup tag input displays
   */
  function setupTagDisplays() {
    const tagInputs = document.querySelectorAll('.tag-input');
    tagInputs.forEach(input => {
      const displayId = input.id + '_display';
      const display = document.getElementById(displayId);
      
      if (display) {
        input.addEventListener('input', (e) => {
          const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
          // Clear existing tags
          display.innerHTML = '';
          // Create tag elements safely
          tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag; // Use textContent to prevent XSS
            display.appendChild(tagSpan);
          });
        });
      }
    });
  }

  /**
   * Setup file preview for screenshots
   */
  function setupFilePreview() {
    const fileInput = document.getElementById('screenshots');
    const preview = document.getElementById('file-preview');

    if (fileInput && preview) {
      fileInput.addEventListener('change', (e) => {
        preview.innerHTML = '';
        const files = Array.from(e.target.files);

        files.forEach(file => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = document.createElement('img');
              img.src = e.target.result;
              img.style.maxWidth = '200px';
              img.style.marginRight = '10px';
              img.style.marginBottom = '10px';
              preview.appendChild(img);
            };
            reader.readAsDataURL(file);
          }
        });
      });
    }
  }

  /**
   * Handle form submission
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    console.log('[AddTrade] Form submitted');

    // Check if system is ready
    if (!window.PersonalPenniesSystem || !window.PersonalPenniesSystem.ready) {
      if (window.showToast) {
        window.showToast('System not ready. Please wait and try again.', 'warning');
      } else {
        alert('System not ready. Please wait and try again.');
      }
      console.error('[AddTrade] PersonalPenniesSystem not ready');
      return;
    }

    try {
      // Gather form data
      const formData = gatherFormData();
      console.log('[AddTrade] Form data:', formData);

      // Validate required fields
      if (!validateFormData(formData)) {
        return;
      }

      // Calculate week key
      const entryDate = new Date(formData.entry_date);
      const weekKey = window.SFTiUtils.getYearWeekNumber(entryDate);
      console.log('[AddTrade] Week key:', weekKey);

      // Save trade using DataAccess
      const tradeKey = await window.PersonalPenniesDataAccess.saveTrade(weekKey, formData);
      console.log('[AddTrade] Trade saved:', tradeKey);

      // Emit event to trigger pipeline
      if (window.SFTiEventBus) {
        window.SFTiEventBus.emit('trade:added', { key: tradeKey, data: formData });
      }

      // Show success message with trade number
      if (window.showToast) {
        window.showToast(`Trade #${formData.trade_number} added successfully! Processing pipeline...`, 'success');
      } else {
        alert('Trade added successfully! Processing pipeline...');
      }

      // Reset form
      document.getElementById('trade-form').reset();
      updateCalculations();

      // Optionally redirect to trades page
      // window.location.href = 'all-trades.html';

    } catch (error) {
      console.error('[AddTrade] Error saving trade:', error);
      if (window.showToast) {
        window.showToast(`Error saving trade: ${error.message}`, 'error', 5000);
      } else {
        alert('Error saving trade: ' + error.message);
      }
    }
  }

  /**
   * Gather all form data
   */
  function gatherFormData() {
    const getValue = (id) => {
      const elem = document.getElementById(id);
      return elem ? elem.value : '';
    };

    const getNumberValue = (id) => {
      const value = getValue(id);
      return value ? parseFloat(value) : 0;
    };

    const getTagsValue = (id) => {
      const value = getValue(id);
      return value ? value.split(',').map(t => t.trim()).filter(t => t) : [];
    };

    // Calculate derived values
    const entryPrice = getNumberValue('entry_price');
    const exitPrice = getNumberValue('exit_price');
    const positionSize = getNumberValue('position_size');
    const direction = getValue('direction');
    const stopLoss = getNumberValue('stop_loss');
    const targetPrice = getNumberValue('target_price');

    // P&L calculations
    let pnlUSD = 0;
    let pnlPercent = 0;

    if (direction === 'LONG') {
      pnlUSD = (exitPrice - entryPrice) * positionSize;
      pnlPercent = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;
    } else if (direction === 'SHORT') {
      pnlUSD = (entryPrice - exitPrice) * positionSize;
      pnlPercent = entryPrice > 0 ? ((entryPrice - exitPrice) / entryPrice) * 100 : 0;
    }

    // Risk:Reward calculation
    let riskRewardRatio = 0;
    if (direction === 'LONG' && stopLoss > 0) {
      const risk = entryPrice - stopLoss;
      const reward = targetPrice - entryPrice;
      riskRewardRatio = risk > 0 ? reward / risk : 0;
    } else if (direction === 'SHORT' && stopLoss > 0) {
      const risk = stopLoss - entryPrice;
      const reward = entryPrice - targetPrice;
      riskRewardRatio = risk > 0 ? reward / risk : 0;
    }

    return {
      trade_number: parseInt(getValue('trade_number')),
      ticker: getValue('ticker').toUpperCase(),
      entry_date: getValue('entry_date'),
      entry_time: getValue('entry_time'),
      exit_date: getValue('exit_date'),
      exit_time: getValue('exit_time'),
      entry_price: entryPrice,
      exit_price: exitPrice,
      position_size: positionSize,
      direction: direction,
      strategy: getValue('strategy'),
      stop_loss: stopLoss,
      target_price: targetPrice,
      risk_reward_ratio: Math.round(riskRewardRatio * 100) / 100,
      broker: getValue('broker'),
      pnl_usd: Math.round(pnlUSD * 100) / 100,
      pnl_percent: Math.round(pnlPercent * 100) / 100,
      strategy_tags: getTagsValue('strategy_tags'),
      setup_tags: getTagsValue('setup_tags'),
      session_tags: getTagsValue('session_tags'),
      market_condition_tags: getTagsValue('market_condition_tags'),
      notes: getValue('notes'),
      screenshots: [], // File handling would need additional implementation
      created_at: new Date().toISOString()
    };
  }

  /**
   * Validate form data
   */
  function validateFormData(data) {
    const showError = (msg) => {
      if (window.showToast) {
        window.showToast(msg, 'error', 4000);
      } else {
        alert(msg);
      }
    };

    if (!data.trade_number || data.trade_number < 1) {
      showError('Please enter a valid trade number');
      return false;
    }

    if (!data.ticker) {
      showError('Please enter a ticker symbol');
      return false;
    }

    if (!data.entry_date || !data.exit_date) {
      showError('Please enter entry and exit dates');
      return false;
    }

    if (!data.entry_time || !data.exit_time) {
      showError('Please enter entry and exit times');
      return false;
    }

    if (data.entry_price <= 0 || data.exit_price <= 0) {
      showError('Please enter valid entry and exit prices');
      return false;
    }

    if (data.position_size <= 0) {
      showError('Please enter a valid position size');
      return false;
    }

    if (!data.direction) {
      showError('Please select a trade direction (LONG or SHORT)');
      return false;
    }

    return true;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddTradeForm);
  } else {
    initAddTradeForm();
  }

})();

console.log('[AddTrade] Form handler loaded');
