import React, { Component } from 'react';
import { connect } from 'react-redux';
import { format } from 'date-fns';
import PropTypes from 'prop-types';
import numbro from 'numbro';

import {
  getCurrentWalletInfo,
  getAvailableSynths,
  loadingScreenIsVisible,
} from '../../ducks';

import { getTransactions } from '../../utils/synthetixApi';
import Container from '../container';

import styles from './transactions-table.module.scss';

const ETHERSCAN_URLS = {
  1: 'https://tronscan.io/#/transaction/',
  2: 'https://shasta.tronscan.io/#/transaction/',
  42: 'https://nile.tronscan.io/#/transaction/',
};

const hexifyAddress = address => window.tronWeb.address.toHex(address);

const compareBlocks = (a, b) => {
  if (a.blockTimestamp < b.blockTimestamp) return 1;
  if (a.blockTimestamp > b.blockTimestamp) return -1;
  return 0;
};

class Transactions extends Component {
  constructor(props) {
    super(props);
    this.state = {
      myTransactions: null,
      allTransactions: null,
      transactions: null,
      showAllTrades: !(
        props.currentWalletInfo && props.currentWalletInfo.selectedWallet
      ),
    };
    this.toggleShowMyTrades = this.toggleShowMyTrades.bind(this);
  }

  async refreshData() {
    const { currentWalletInfo } = this.props;
    const transactions = await getTransactions(
      currentWalletInfo && currentWalletInfo.networkId
    );
    let showAllTrades = true;

    const filteredTransactions = transactions
      .sort(compareBlocks)
      .filter(transaction => !transaction.exchangeToCurrency.includes('XDR'));

    let myTransactions;
    if (currentWalletInfo.selectedWallet) {
      showAllTrades = false;
      myTransactions = filteredTransactions.filter(
        transaction =>
          transaction.from === hexifyAddress(currentWalletInfo.selectedWallet)
      );
    }

    console.log('myTransactions', myTransactions);

    this.setState({
      allTransactions: filteredTransactions,
      myTransactions,
      transactions: showAllTrades ? filteredTransactions : myTransactions,
      showAllTrades,
    });
  }

  componentDidMount() {
    if (!this.props.availableSynths.length) return;

    this.refreshData();
  }

  componentDidUpdate(prevProps) {
    const { currentWalletInfo } = prevProps;
    const prevSelectedWallet = currentWalletInfo.selectedWallet;
    const selectedWallet =
      this.props.currentWalletInfo &&
      this.props.currentWalletInfo.selectedWallet;
    if (
      prevSelectedWallet !== selectedWallet ||
      (!this.state.transactions && !this.props.loadingScreenIsVisible)
    ) {
      this.refreshData();
    }
  }

  toggleShowMyTrades() {
    const { allTransactions, myTransactions, showAllTrades } = this.state;
    if (showAllTrades && (!myTransactions || myTransactions.length === 0))
      return null;
    this.setState({
      transactions: showAllTrades ? myTransactions : allTransactions,
      showAllTrades: !showAllTrades,
    });
  }

  renderTransactionSynths(transaction) {
    let [exchangeFromCurrency, exchangeToCurrency] = [
      transaction.exchangeFromCurrency,
      transaction.exchangeToCurrency,
    ].map(key => key.replace(/[^\w]/g, ''));

    return (
      <div className={styles.transactionTableSynth}>
        <div className={styles.transactionPair}>
          <img src={`images/synths/${exchangeFromCurrency}-icon.svg`} />
          <span>{exchangeFromCurrency}</span>
        </div>
        /
        <div className={styles.transactionPair}>
          <img src={`images/synths/${exchangeToCurrency}-icon.svg`} />
          <span>{exchangeToCurrency}</span>
        </div>
      </div>
    );
  }

  renderTableBody() {
    const { transactions } = this.state;
    const { currentWalletInfo } = this.props;
    const networkId =
      currentWalletInfo && currentWalletInfo.networkId
        ? currentWalletInfo.networkId
        : 1;
    if (!transactions) return null;
    return transactions.map((transaction, index) => {
      return (
        <tr key={index}>
          <td>{this.renderTransactionSynths(transaction)}</td>
          <td>
            {numbro(
              transaction.exchangeFromAmount / transaction.exchangeToAmount
            ).format('0,0.000000')}
          </td>
          <td>
            {transaction.exchangeFromAmount}/
            {numbro(transaction.exchangeToAmount).format('0,0.0000')}
          </td>

          <td>
            {format(new Date(transaction.blockTimestamp), 'D/M/YYYY H:mmA ')}
          </td>
          <td className={styles.transactionLinkWrapper}>
            <a
              className={styles.transactionLink}
              href={`${ETHERSCAN_URLS[networkId]}${transaction.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              See txn
            </a>
          </td>
        </tr>
      );
    });
  }

  renderTransactionTable() {
    const { showAllTrades } = this.state;
    const { currentWalletInfo } = this.props;
    return (
      <div className={styles.tableWrapper}>
        <table cellSpacing="0" className={styles.transactionTable}>
          <thead>
            <tr>
              <th className={styles.headingWrapper}>
                <h2>Trading History</h2>
                {currentWalletInfo.selectedWallet ? (
                  <button onClick={this.toggleShowMyTrades}>
                    {showAllTrades ? 'Show my trades' : 'Show all trades'}
                  </button>
                ) : null}
              </th>
              <th>
                <h3>Rate</h3>
              </th>
              <th>
                <h3 style={{ whiteSpace: 'nowrap' }}>Amount (from/to)</h3>
              </th>
              <th>
                <h3>Date / Time</h3>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>{this.renderTableBody()}</tbody>
        </table>
      </div>
    );
  }

  render() {
    const { transactions } = this.state;
    const hasNoTransactions = !transactions || transactions.length === 0;
    return (
      <div style={{ height: '100%' }}>
        <div className={styles.transactionsLayout}>
          <Container minHeight={'500px'}>
            {hasNoTransactions ? (
              <h2 style={{ marginTop: '40px' }}>No Trades recorded.</h2>
            ) : (
              this.renderTransactionTable()
            )}
          </Container>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    currentWalletInfo: getCurrentWalletInfo(state),
    availableSynths: getAvailableSynths(state),
    loadingScreenIsVisible: loadingScreenIsVisible(state),
  };
};

const mapDispatchToProps = {};

Transactions.propTypes = {
  currentWalletInfo: PropTypes.object.isRequired,
  availableSynths: PropTypes.array.isRequired,
  loadingScreenIsVisible: PropTypes.bool.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Transactions);
