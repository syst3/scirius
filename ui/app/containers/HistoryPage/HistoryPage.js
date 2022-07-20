/*
Copyright(C) 2018 Stamus Networks
Written by Eric Leblond <eleblond@stamus-networks.com>

This file is part of Scirius.

Scirius is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Scirius is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Scirius.  If not, see <http://www.gnu.org/licenses/>.
*/

import React from 'react';
import PropTypes from 'prop-types';
import { Spin, Collapse, Row, Col } from 'antd';
import axios from 'axios';
import * as config from 'config/Api';
import { sections, PAGE_STATE } from 'ui/constants';
import Filters from 'ui/components/Filters';
import HistoryItem from 'ui/components/HistoryItem';
import ErrorHandler from 'ui/components/Error';
import moment from 'moment';
import { TableOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import buildListParams from 'ui/helpers/buildListParams';
import HuntPaginationRow from '../../HuntPaginationRow';
import { buildFilter, buildListUrlParams } from '../../helpers/common';

const { Panel } = Collapse;

export default class HistoryPage extends React.Component {
  constructor(props) {
    super(props);

    const historyConf = buildListParams(JSON.parse(localStorage.getItem('history')), {
      pagination: {
        page: 1,
        perPage: 6,
        perPageOptions: [6, 10, 15, 25, 50],
      },
      sort: { id: 'date', asc: false },
      view_type: 'list',
    });

    let historyFilters = localStorage.getItem('history_filters') || '[]';

    if (!historyFilters) {
      localStorage.setItem('history_filters', JSON.stringify(historyFilters));
    } else {
      historyFilters = JSON.parse(historyFilters);
    }

    this.state = { data: [], count: 0, history: historyConf, historyFilters };
    this.fetchData = this.fetchData.bind(this);
    this.buildFilter = buildFilter;

    this.props.getActionTypes();
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    if (JSON.stringify(prevProps.filters) !== JSON.stringify(this.props.filters)) {
      this.fetchData();
    }
  }

  updateHistoryListState(historyState) {
    this.setState({ history: historyState }, () => this.fetchData());
    localStorage.setItem('history', JSON.stringify(historyState));
  }

  fetchData() {
    const stringFilters = this.buildFilter(this.props.filters);
    const listParams = buildListUrlParams(this.state.history);
    this.setState({ loading: true });
    axios
      .get(`${config.API_URL}${config.HISTORY_PATH}?${listParams}${stringFilters}`)
      .then(res => {
        this.setState({
          data: res.data,
          count: res.data.count,
          loading: false,
        });
      })
      .catch(() => {
        this.setState({ loading: false });
      });
  }

  render() {
    let expand = false;
    for (let filter = 0; filter < this.props.filters; filter += 1) {
      if (this.props.filters[filter].id === 'comment' || this.props.filters[filter].id === 'client_ip') {
        expand = true;
        break;
      }
    }
    return (
      <div>
        <ErrorHandler>
          <Filters page="HISTORY" section={sections.HISTORY} queryTypes={['all']} />
        </ErrorHandler>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0 10px 0' }}>{this.state.loading && <Spin />}</div>
        {this.state.data.results && (
          <Collapse>
            {this.state.data.results.map(item => {
              const date = moment(item.date).format('YYYY-MM-DD, hh:mm:ss a');
              const info = [
                <Col>Date: {date}</Col>,
                <Col style={{ paddingLeft: 15 }}>
                  <UserOutlined /> {item.username}
                </Col>,
              ];
              if (item.ua_objects.ruleset && item.ua_objects.ruleset.pk) {
                info.push(
                  <Col style={{ paddingLeft: 15 }}>
                    <TableOutlined /> {item.ua_objects.ruleset.value}
                  </Col>,
                );
              }
              if (item.ua_objects.rule && item.ua_objects.rule.sid) {
                info.push(
                  <Col style={{ paddingLeft: 15 }}>
                    <a
                      onClick={() => {
                        this.props.addFilter(sections.GLOBAL, { id: 'alert.signature_id', value: item.ua_objects.rule.sid, negated: false });
                        this.props.switchPage(PAGE_STATE.rules_list, item.ua_objects.rule.sid);
                      }}
                    >
                      <i className="pficon-security" /> {item.ua_objects.rule.sid}
                    </a>
                  </Col>,
                );
              }

              return (
                <Panel
                  key={item.pk}
                  showArrow={false}
                  header={
                    <Row>
                      <Col md={1}>
                        <MailOutlined />
                      </Col>
                      <Col md={2}>{item.title}</Col>
                      <Col flex="auto">{item.description}</Col>
                      {info}
                    </Row>
                  }
                >
                  <HistoryItem key={item.pk} data={item} switchPage={this.props.switchPage} expand_row={expand} />
                </Panel>
              );
            })}
          </Collapse>
        )}
        <ErrorHandler>
          <HuntPaginationRow
            viewType="list"
            onPaginationChange={this.updateHistoryListState}
            itemsCount={this.state.count}
            itemsList={this.state.history}
          />
        </ErrorHandler>
      </div>
    );
  }
}

HistoryPage.propTypes = {
  filters: PropTypes.any,
  switchPage: PropTypes.any,
  getActionTypes: PropTypes.func,
  addFilter: PropTypes.func,
  user: PropTypes.shape({
    pk: PropTypes.any,
    timezone: PropTypes.any,
    username: PropTypes.any,
    firstName: PropTypes.any,
    lastName: PropTypes.any,
    isActive: PropTypes.any,
    email: PropTypes.any,
    dateJoined: PropTypes.any,
    permissions: PropTypes.any,
  }),
};
