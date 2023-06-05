import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ResourceService, ConfigService, NavigationHelperService } from '@sunbird/shared';
import * as _ from 'lodash-es';
import { Subject, of} from 'rxjs';
import { debounceTime, distinctUntilChanged, delay, flatMap } from 'rxjs/operators';
import { IInteractEventEdata } from '@sunbird/telemetry';
import { WorkSpaceService } from './../../services';
import {  ISort } from '@sunbird/core';

@Component({
  selector: 'app-workspace-content-filter',
  templateUrl: './workspace-content-filter.component.html',
  styleUrls: ['./workspace-content-filter.component.scss']
})
export class WorkspaceContentFilterComponent implements OnInit {
  modelChanged: Subject<string> = new Subject<string>();
  /**
   * To navigate to other pages
   */
  route: Router;
  /**
   * To send activatedRoute.snapshot to router navigation
   * service for redirection to draft  component
  */
  private activatedRoute: ActivatedRoute;
  /**
   * value typed
   */
  query: string;
  /**
   * SortingOptions
  */
  sortingOptions: Array<string>;
  /**
    * To show / hide sortIcon
   */
  sortIcon = true;
  /**
    * position for the popup
  */
  position: string;
  /**
    * To call resource service which helps to use language constant
  */
  public resourceService: ResourceService;
   /**
    * To call workSpace service 
  */
    public workspaceService: WorkSpaceService;
  /**
  * To get url, app configs
  */
  public config: ConfigService;

  sortByOption: string;
  /**
  * type of filter
  */
  public filterType: any;
  /**
  * label for filter selected
  */
  label: Array<string>;
  /**
  * redirect url
  */
  public redirectUrl: string;
  queryParams: any;
  filterIntractEdata: IInteractEventEdata;

  /**
   * sorting options needs to be applied
   */
  @Input() sortingByOptions: Array<ISort>;

  /**
   * Constructor to create injected service(s) object
   Default method of Draft Component class
   * @param {SearchService} SearchService Reference of SearchService
   * @param {UserService} UserService Reference of UserService
   * @param {Router} route Reference of Router
   * @param {PaginationService} paginationService Reference of PaginationService
   * @param {ActivatedRoute} activatedRoute Reference of ActivatedRoute
   * @param {ConfigService} config Reference of ConfigService
 */
  constructor(resourceService: ResourceService, config: ConfigService,
    activatedRoute: ActivatedRoute,
    public navigationHelperService: NavigationHelperService,
    workspaceService: WorkSpaceService,
    route: Router) {
    this.route = route;
    this.activatedRoute = activatedRoute;
    this.resourceService = resourceService;
    this.config = config;
    this.position = 'bottom right';
    this.route.onSameUrlNavigation = 'reload';
    this.label = this.config.dropDownConfig.FILTER.WORKSPACE.label;
    this.sortingOptions = this.config.dropDownConfig.FILTER.RESOURCES.sortingOptions;
    this.workspaceService= workspaceService;
  }

  ngOnInit() {
    this.sortingOptions = this.sortingByOptions?.length ? this.sortingByOptions : this.config.dropDownConfig.FILTER.RESOURCES.sortingOptions;
    this.setFilterTypeAndRedirectURL();
    this.activatedRoute.queryParams
      .subscribe(params => {
        this.queryParams = { ...params };
        this.query = this.queryParams['query'];
        this.sortByOption = _.isArray(this.queryParams['sort_by']) ? this.queryParams['sort_by'][0] : this.queryParams['sort_by'];
        _.forIn(params, (value, key) => {
          if (typeof value === 'string' && key !== 'query') {
            this.queryParams[key] = [value];
          }
        });
      });
      this.modelChanged.pipe(debounceTime(1000),
      distinctUntilChanged(),
      flatMap(search => of(search).pipe(delay(500)))
      ).
      subscribe(query => {
        this.query = query;
        this.handleSearch();
      });
      this.filterIntractEdata = {
        id: 'filter',
        type: 'click',
        pageid: 'all-my-content-page'
      };
      this.workspaceService.workspaceSearchLabelConfig$.subscribe((searchLabelConfig) => {
        if(searchLabelConfig.searchLabel?.label && searchLabelConfig.searchLabel?.label.length) {
          this.label = searchLabelConfig.searchLabel?.label;
        }
      })
  }

  setFilterTypeAndRedirectURL() {
    if (_.includes(this.route.url, 'published')) {
      this.filterType = this.config.appConfig.published.filterType;
      this.redirectUrl = this.config.appConfig.published.inPageredirectUrl;
    } else if (_.includes(this.route.url, 'draft')) {
      this.filterType = this.config.appConfig.draft.filterType;
      this.redirectUrl = this.config.appConfig.draft.inPageredirectUrl;
    } else if (_.includes(this.route.url, 'alltextbooks')) {
      this.filterType = this.config.appConfig.alltextbooks.filterType;
      this.redirectUrl = this.config.appConfig.alltextbooks.inPageredirectUrl;
    } else if(_.includes(this.route.url, 'list')){
       this.filterType = this.config.appConfig.assessment.filterType;
       this.redirectUrl = this.config.appConfig.assessment.inPageredirectUrl;
    }
    else if(_.includes(this.route.url, 'assign/all')){
      this.filterType = this.config.appConfig.allCandidateList.filterType;
       this.redirectUrl = this.config.appConfig.allCandidateList.inPageredirectUrl;
    }
    else if(_.includes(this.route.url, 'assign/pendingForSubmission')){
      this.filterType = this.config.appConfig.pendingList.filterType;
       this.redirectUrl = this.config.appConfig.pendingList.inPageredirectUrl;
    }
    else if(_.includes(this.route.url, 'resultEvaluation/all')){
      this.filterType = this.config.appConfig.resultEvaluation.filterType;
       this.redirectUrl = this.config.appConfig.resultEvaluation.inPageredirectUrl;
    }
    else if(_.includes(this.route.url, 'resultEvaluation/pendingForEvaluation')){
      this.filterType = this.config.appConfig.pendingForEvaluation.filterType;
       this.redirectUrl = this.config.appConfig.pendingForEvaluation.inPageredirectUrl;
    }
     else {
      this.filterType = this.config.appConfig.allmycontent.filterType;
      this.redirectUrl = this.config.appConfig.allmycontent.inPageredirectUrl;
    }
  }

  public handleSearch() {
    if (!_.isEmpty(this.query)) {
      this.queryParams['query'] = this.query;
    } else {
      delete this.queryParams['query'];
    }
    this.route.navigate([this.redirectUrl], { queryParams: this.queryParams});
  }
  keyup(event) {
    this.query = event;
    this.modelChanged.next(this.query);
  }

  applySorting(sortByOption) {
    this.sortIcon = !this.sortIcon;
    this.queryParams['sortType'] = this.sortIcon ? 'desc' : 'asc';
     this.queryParams['sort_by'] = sortByOption;
    this.route.navigate([this.redirectUrl], { queryParams: this.queryParams});
  }
  removeFilterSelection(filterType, value) {
    const itemIndex = this.queryParams[filterType].indexOf(value);
    if (itemIndex !== -1) {
      this.queryParams[filterType].splice(itemIndex, 1);
    }
    this.route.navigate([this.redirectUrl], { queryParams: this.queryParams});
  }
}
