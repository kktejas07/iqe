using IQEApp.Service.HomeService;
using IQEApp.Web.Controllers.Common;
using IQEApp.Web.Models.CommonModels;
using IQEApp.Web.Models.EnquiryModel;
using IQEApp.Web.Models.HomeModel;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Transactions;
using System.Web;
using System.Web.Mvc;
//using DocumentFormat.OpenXml.Drawing;

namespace IQEApp.Web.Controllers
{
    //[CustomAuthorize(Roles = "Super Admin Role, Admin Role, Technician Role, Coordinator Role, Quality Check Role, Finance Role")]
    public class HomeController : BaseController
    {
        private readonly IHomeService _homeService;
        HomeBusinessModel objHomeBusinessModel = new HomeBusinessModel();
        public HomeController()
        {
            _homeService = new HomeService();
        }

        public ActionResult HomePage()
        {
            CurrentUser.SetUserViewModuleType(UserViewModuleType.Home);
            ViewBag.CurrentPageCount = 10;

            if (CurrentUser.RoleId.FirstOrDefault() == (int)UserRoles.EmployeeRole)
            {
                // need to check this functionality later, for a moment kept the Same SP logic 'GetOpenCallsVisitsList1'. this is verify 'GetMyScheduledVisits_bkp'
                objHomeBusinessModel.GetMyScheduledVisits(1, CurrentUser.SiteId, CurrentUser.UserId, _homeService);
                return View("ScheduleVisitsList", objHomeBusinessModel);
            }
            else
            {
                objHomeBusinessModel.GetSelectDateScheduledVisitsList(CurrentUser.SiteId, DateTime.Today, "", "", 0, 1000, true, "ASC", _homeService);
                if (objHomeBusinessModel.LstHomeDetailViewModel.Count > 0)
                {
                    ViewBag.Total = objHomeBusinessModel.LstHomeDetailViewModel.FirstOrDefault().Total;
                    ViewBag.ProspectiveCount = objHomeBusinessModel.LstHomeDetailViewModel.FirstOrDefault().ProspectiveCount;
                }
                ViewBag.RoleId = CurrentUser.RoleId.FirstOrDefault();
                ViewBag.VisitType = "Active";
                return View("ScheduleVisitsList", objHomeBusinessModel);
            }
        }

        public ActionResult GetCancelledVisits(int VisitStatus)
        {
            var (homeList, prospectiveCount) = objHomeBusinessModel.GetCancelledVisits(CurrentUser.SiteId, DateTime.Today, "", "", 0, 1000, VisitStatus, "ASC", _homeService);

            objHomeBusinessModel.LstHomeDetailViewModel = homeList.ToList();

            if (objHomeBusinessModel.LstHomeDetailViewModel.Count > 0)
            {
                ViewBag.Total = objHomeBusinessModel.LstHomeDetailViewModel.First().Total;
            }

            // ProspectiveCount is now taken from tuple, NOT from list
            ViewBag.ProspectiveCount = prospectiveCount;
            if (VisitStatus == 11)
                ViewBag.VisitType = "Abortive";

            if (VisitStatus == 10)
                ViewBag.VisitType = "Cancelled";

            if (VisitStatus == 0)
                ViewBag.VisitType = "Inactive";
            ViewBag.RoleId = CurrentUser.RoleId.FirstOrDefault();

            return PartialView("_ScheduleVisitList", objHomeBusinessModel);
        }


        public ActionResult GetProspectiveVisits(int VisitStatus)
        {
            objHomeBusinessModel.GetProspectiveVisits(CurrentUser.SiteId, DateTime.Today, "", "", 0, 1000, "ASC", _homeService);
            if (objHomeBusinessModel.LstHomeDetailViewModel.Count > 0)
            {
                ViewBag.Total = ViewBag.ProspectiveCount = objHomeBusinessModel.LstHomeDetailViewModel.FirstOrDefault().Total;
            }
            ViewBag.RoleId = CurrentUser.RoleId.FirstOrDefault();
            ViewBag.VisitType = "Prospective";
            return PartialView("_ScheduleVisitList", objHomeBusinessModel);
        }

        public ActionResult GetProspectiveAndSaveScheduleVisit(int VisitPId)
        {
            var VisitId = objHomeBusinessModel.GetProspectiveAndSaveScheduleVisit(VisitPId, CurrentUser.UserId, _homeService);
            if (VisitId > 0)
            {
                return Json(new { VisitId = VisitId, message = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { VisitId = VisitId, message = "error" }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult GetSelDateScheduledVisitsList1(DateTime selDate)
        {
            objHomeBusinessModel.GetSelectDateScheduledVisitsList(CurrentUser.SiteId, selDate, "", "", 0, 10, true, "ASC", _homeService);
            return Json(objHomeBusinessModel.LstHomeDetailViewModel, JsonRequestBehavior.AllowGet);
        }

        public ActionResult UploadInspectionReport(int VisitId, string VisitSeqID, bool revised)
        {
            InspectionReportViewModel objInspectionReportViewModel = new InspectionReportViewModel();
            objInspectionReportViewModel = objHomeBusinessModel.UploadIRDocumentsToAdd_Edit(VisitId, CurrentUser.SiteId, revised, _homeService);
            return PartialView("_UploadInspectionReport", objInspectionReportViewModel);
        }

        [HttpPost]
        public ActionResult CloseVisitNoReport(HomeViewModel model)
        {
            if (model == null || model.VisitId <= 0)
                return Json(new { status = false, message = "Invalid visit" }, JsonRequestBehavior.AllowGet);

            try
            {
                model.ModifiedBy = CurrentUser.UserId;
                bool isSuccess = false;

                if (!string.IsNullOrWhiteSpace(model.ReferenceVisitSeqId))
                {
                    var result = objHomeBusinessModel.CloseVisitReferencingVisit(model, _homeService);
                    isSuccess = result.Success;
                    if (isSuccess)
                        return Json(new { status = true, message = result.Message ?? "Visit closed (no report) successfully" }, JsonRequestBehavior.AllowGet);
                    else
                        return Json(new { status = false, message = result.Message ?? "Failed to close visit" }, JsonRequestBehavior.AllowGet);
                }
                else
                {
                    model.VisitStatusId = 11;
                    var res = objHomeBusinessModel.OnHoldCancalledInspectionVisit(model, _homeService);
                    if (res)
                        return Json(new { status = true, message = "Visit closed (no report) successfully" }, JsonRequestBehavior.AllowGet);
                    else
                        return Json(new { status = false, message = "Failed to close visit" }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                errorLogObj.LogError("CloseVisitNoReport error", ex);
                return Json(new { status = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> SubmitUploadInspectionReport1(InspectionReportViewModel objIRV)
        {
            if (objIRV == null)
                return Json(new { status = false, message = "Invalid input" }, JsonRequestBehavior.AllowGet);

            bool dbUpdateSuccess = false;
            var savedFiles = new List<(string FilePath, InspectionReportViewModel PayloadCopy)>();
            string filesRoot = ConfigurationManager.AppSettings["InspectionReportFilesPath"];
            string backupRoot = ConfigurationManager.AppSettings["InspectionReportFilesBackUpPath"];

            try
            {
                var lstInspectionReportModel = objHomeBusinessModel.GetInspectionReportBackupFiles(objIRV.VisitId, _homeService);
                if (lstInspectionReportModel != null && lstInspectionReportModel.Count > 0)
                {
                    if (!Directory.Exists(backupRoot))
                        Directory.CreateDirectory(backupRoot);

                    foreach (var backfile in lstInspectionReportModel)
                    {
                        if (!string.IsNullOrEmpty(backfile.FileName))
                        {
                            string oldPath = Path.Combine(filesRoot, backfile.FileName);
                            if (System.IO.File.Exists(oldPath))
                            {
                                string newFilePath = Path.Combine(backupRoot, backfile.FileName);
                                System.IO.File.Move(oldPath, newFilePath);
                            }
                        }
                    }
                }

                dbUpdateSuccess = objHomeBusinessModel.UpdateInspectionReportByVisitID(objIRV.VisitId, objIRV.InspReportDate, objIRV.LoginUserId, _homeService);
                if (!dbUpdateSuccess)
                    return Json(new { status = false, message = "Failed to update inspection report" }, JsonRequestBehavior.AllowGet);

                var saveTasks = new List<Task>();
                int maxParallelWrites = Math.Max(2, Environment.ProcessorCount);
                using (var throttle = new System.Threading.SemaphoreSlim(maxParallelWrites))
                {
                    foreach (var po in objIRV.LstPONumbers ?? new List<POInspectionItem>())
                    {
                        if (string.IsNullOrEmpty(po.InspReportNo))
                            continue;

                        if (objHomeBusinessModel.IsInspReportNumberExitsAlready(po.InspReportNo, _homeService))
                        {
                            return Json(new { status = false, message = $"Report No {po.InspReportNo} Exists Already" }, JsonRequestBehavior.AllowGet);
                        }

                        foreach (var file in po.UploadFiles ?? new List<HttpPostedFileBase>())
                        {
                            if (file == null || file.ContentLength <= 0)
                                continue;

                            await throttle.WaitAsync().ConfigureAwait(false);

                            var capturedPo = po;
                            var capturedFile = file;

                            var task = Task.Run(async () =>
                            {
                                try
                                {
                                    string originalFileName = Path.GetFileName(capturedFile.FileName);
                                    string uniqueFileName = $"{Guid.NewGuid():N}_{originalFileName}";
                                    string savePath = Path.Combine(filesRoot, uniqueFileName);

                                    var dir = Path.GetDirectoryName(savePath);
                                    if (!Directory.Exists(dir))
                                        Directory.CreateDirectory(dir);

                                    using (var destStream = new FileStream(savePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
                                    {
                                        if (capturedFile.InputStream.CanSeek)
                                            capturedFile.InputStream.Position = 0;

                                        await capturedFile.InputStream.CopyToAsync(destStream).ConfigureAwait(false);
                                    }

                                    var payload = new InspectionReportViewModel
                                    {
                                        VisitId = objIRV.VisitId,
                                        FileName = originalFileName,
                                        FilePath = savePath,
                                        InspReportNo = capturedPo.InspReportNo,
                                        PONId = capturedPo.PONId,
                                        POItemId = capturedPo.POItemId,
                                        VisitedFrom = capturedPo.VisitedFrom,
                                        VisitedTo = capturedPo.VisitedTo,
                                        LoginUserId = objIRV.LoginUserId
                                    };

                                    lock (savedFiles)
                                    {
                                        savedFiles.Add((savePath, payload));
                                    }
                                }
                                finally
                                {
                                    throttle.Release();
                                }
                            });

                            saveTasks.Add(task);
                        }
                    }

                    await Task.WhenAll(saveTasks).ConfigureAwait(false);
                }

                bool anyFileUploaded = false;
                using (var transcope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    bool flag = false;
                    foreach (var saved in savedFiles)
                    {
                        var payload = saved.PayloadCopy;
                        var tempObj = objIRV;
                        tempObj.FileName = payload.FileName;
                        tempObj.FilePath = payload.FilePath;
                        tempObj.InspReportNo = payload.InspReportNo;
                        tempObj.PONId = payload.PONId;
                        tempObj.POItemId = payload.POItemId;
                        tempObj.VisitedFrom = payload.VisitedFrom;
                        tempObj.VisitedTo = payload.VisitedTo;

                        bool fileUploaded = objHomeBusinessModel.UploadInspectionReportByVisitID(tempObj, flag, _homeService);
                        flag = true;
                        if (fileUploaded)
                            anyFileUploaded = true;
                        else
                            throw new Exception($"Failed to save DB record for file {payload.FileName}");
                    }

                    transcope.Complete();
                }

                return Json(new { status = true, message = "Inspection report uploaded successfully" }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                try
                {
                    foreach (var f in savedFiles)
                    {
                        if (!string.IsNullOrEmpty(f.FilePath) && System.IO.File.Exists(f.FilePath))
                        {
                            System.IO.File.Delete(f.FilePath);
                        }
                    }
                }
                catch { }

                return Json(new { status = false, message = $"Error: {ex.Message}" }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> SubmitUploadInspectionReport(InspectionReportViewModel objIRV)
        {
            if (objIRV == null)
                return Json(new { status = false, message = "Invalid input" }, JsonRequestBehavior.AllowGet);

            bool dbUpdateSuccess = false;

            // Holds BOTH existing + newly uploaded files
            var savedFiles = new List<(string FilePath, InspectionReportViewModel PayloadCopy)>();

            string filesRoot = ConfigurationManager.AppSettings["InspectionReportFilesPath"];
            string backupRoot = ConfigurationManager.AppSettings["InspectionReportFilesBackUpPath"];

            try
            {
                /* =========================================================
                   1) BACKUP EXISTING FILES (UNCHANGED)
                ========================================================== */
                var lstInspectionReportModel =
                    objHomeBusinessModel.GetInspectionReportBackupFiles(objIRV.VisitId, _homeService);

                if (lstInspectionReportModel != null && lstInspectionReportModel.Count > 0)
                {
                    if (!Directory.Exists(backupRoot))
                        Directory.CreateDirectory(backupRoot);

                    foreach (var backfile in lstInspectionReportModel)
                    {
                        if (!string.IsNullOrEmpty(backfile.FileName))
                        {
                            string oldPath = Path.Combine(filesRoot, backfile.FileName);
                            if (System.IO.File.Exists(oldPath))
                            {
                                string newPath = Path.Combine(backupRoot, backfile.FileName);
                                System.IO.File.Move(oldPath, newPath);
                            }
                        }
                    }
                }

                /* =========================================================
                   2) UPDATE HEADER DETAILS (UNCHANGED)
                ========================================================== */
                dbUpdateSuccess =
                    objHomeBusinessModel.UpdateInspectionReportByVisitID(
                        objIRV.VisitId,
                        objIRV.InspReportDate,
                        objIRV.LoginUserId,
                        _homeService);

                if (!dbUpdateSuccess)
                    return Json(new { status = false, message = "Failed to update inspection report" },
                                JsonRequestBehavior.AllowGet);

                /* =========================================================
                   3) ADD EXISTING FILES BACK (⭐ FIX #1 ⭐)
                ========================================================== */
                foreach (var po in objIRV.LstPONumbers ?? new List<POInspectionItem>())
                {
                    var existingFiles = po.ExistingFiles ?? new List<string>();
                    var removedFiles = string.IsNullOrEmpty(po.RemovedFiles)
                        ? new List<string>()
                        : po.RemovedFiles.Split(';').Select(x => x.Trim()).ToList();

                    var finalExistingFiles = existingFiles.Except(removedFiles).ToList();

                    foreach (var fileName in finalExistingFiles)
                    {
                        var payload = new InspectionReportViewModel
                        {
                            VisitId = objIRV.VisitId,
                            FileName = fileName,
                            FilePath = Path.Combine(filesRoot, fileName),
                            InspReportNo = po.InspReportNo,
                            PONId = po.PONId,
                            POItemId = po.POItemId,
                            VisitedFrom = po.VisitedFrom,
                            VisitedTo = po.VisitedTo,
                            LoginUserId = objIRV.LoginUserId
                        };

                        savedFiles.Add((payload.FilePath, payload));
                    }
                }

                /* =========================================================
                   4) SAVE NEWLY UPLOADED FILES (UNCHANGED LOGIC)
                ========================================================== */
                var saveTasks = new List<Task>();
                int maxParallelWrites = Math.Max(2, Environment.ProcessorCount);

                using (var throttle = new System.Threading.SemaphoreSlim(maxParallelWrites))
                {
                    foreach (var po in objIRV.LstPONumbers ?? new List<POInspectionItem>())
                    {
                        if (string.IsNullOrEmpty(po.InspReportNo))
                            continue;

                        if (objHomeBusinessModel.IsInspReportNumberExitsAlready(po.InspReportNo, _homeService))
                        {
                            return Json(new
                            {
                                status = false,
                                message = $"Report No {po.InspReportNo} Exists Already"
                            }, JsonRequestBehavior.AllowGet);
                        }

                        foreach (var file in po.UploadFiles ?? new List<HttpPostedFileBase>())
                        {
                            if (file == null || file.ContentLength <= 0)
                                continue;

                            await throttle.WaitAsync().ConfigureAwait(false);

                            var capturedPo = po;
                            var capturedFile = file;

                            var task = Task.Run(async () =>
                            {
                                try
                                {
                                    string originalFileName = Path.GetFileName(capturedFile.FileName);
                                    string uniqueFileName = $"{Guid.NewGuid():N}_{originalFileName}";
                                    string savePath = Path.Combine(filesRoot, uniqueFileName);

                                    if (!Directory.Exists(filesRoot))
                                        Directory.CreateDirectory(filesRoot);

                                    using (var fs = new FileStream(
                                        savePath,
                                        FileMode.Create,
                                        FileAccess.Write,
                                        FileShare.None,
                                        81920,
                                        true))
                                    {
                                        if (capturedFile.InputStream.CanSeek)
                                            capturedFile.InputStream.Position = 0;

                                        await capturedFile.InputStream.CopyToAsync(fs)
                                            .ConfigureAwait(false);
                                    }

                                    var payload = new InspectionReportViewModel
                                    {
                                        VisitId = objIRV.VisitId,
                                        FileName = originalFileName,
                                        FilePath = savePath,
                                        InspReportNo = capturedPo.InspReportNo,
                                        PONId = capturedPo.PONId,
                                        POItemId = capturedPo.POItemId,
                                        VisitedFrom = capturedPo.VisitedFrom,
                                        VisitedTo = capturedPo.VisitedTo,
                                        LoginUserId = objIRV.LoginUserId
                                    };

                                    lock (savedFiles)
                                    {
                                        savedFiles.Add((savePath, payload));
                                    }
                                }
                                finally
                                {
                                    throttle.Release();
                                }
                            });

                            saveTasks.Add(task);
                        }
                    }

                    await Task.WhenAll(saveTasks).ConfigureAwait(false);
                }

                /* =========================================================
                   5) DB INSERT (UNCHANGED – WORKS NOW)
                ========================================================== */
                using (var scope =
                    new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    bool flag = false;

                    foreach (var saved in savedFiles)
                    {
                        var p = saved.PayloadCopy;

                        objIRV.FileName = p.FileName;
                        objIRV.FilePath = p.FilePath;
                        objIRV.InspReportNo = p.InspReportNo;
                        objIRV.PONId = p.PONId;
                        objIRV.POItemId = p.POItemId;
                        objIRV.VisitedFrom = p.VisitedFrom;
                        objIRV.VisitedTo = p.VisitedTo;

                        bool uploaded =
                            objHomeBusinessModel.UploadInspectionReportByVisitID(
                                objIRV, flag, _homeService);

                        if (!uploaded)
                            throw new Exception($"DB insert failed for {p.FileName}");

                        flag = true;
                    }

                    scope.Complete();
                }

                return Json(new { status = true, message = "Inspection report uploaded successfully" },
                            JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                // Cleanup newly saved files
                foreach (var f in savedFiles)
                {
                    if (System.IO.File.Exists(f.FilePath))
                        System.IO.File.Delete(f.FilePath);
                }

                return Json(new { status = false, message = ex.Message },
                            JsonRequestBehavior.AllowGet);
            }
        }
        [HttpPost]
        public ActionResult SubmitUploadInspectionReport1(InspectionReportViewModel objIRV, List<HttpPostedFileBase> files)
        {
            var isSuccess = false;
            var isfileSuccess = false;

            return Json(new { status = isSuccess, message = "" }, JsonRequestBehavior.AllowGet);
        }

        public ActionResult FetchMyScheduledVisits(int statusId)
        {
            objHomeBusinessModel.GetMyScheduledVisits(statusId, CurrentUser.SiteId, CurrentUser.UserId, _homeService);
            return PartialView("_ViewMySchedules", objHomeBusinessModel.LstHomeDetailViewModel);
        }

        [HttpPost]
        public ActionResult SubmitQualityCheckDateByVisitID(HomeViewModel objHDM)
        {
            var isSuccess = false;
            isSuccess = objHomeBusinessModel.SubmitQualityCheckDateByVisitID(objHDM, _homeService);

            if (isSuccess)
            {
                return Json(new { status = isSuccess, message = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { status = isSuccess, message = "error" }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public ActionResult GetInspectionReportFiles(int VisitId)
        {
            var lstInspectionReportModel = objHomeBusinessModel.GetInspectionReportFiles(VisitId, _homeService);

            if (lstInspectionReportModel != null)
            {
                return Json(new
                {
                    status = true,
                    message = "Success",
                    data = lstInspectionReportModel
                }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new
                {
                    status = false,
                    message = "Failed to fetch Inspection Report files."
                }, JsonRequestBehavior.AllowGet);
            }
        }

        [Authorize]
        public ActionResult DownloadFile(int VisitId, string FileName)
        {
            if (SingletonScreenFeatureMapping.CanPerformOperation((int)ScnFetMapId.EnquiryEdit, CurrentUser.RoleId.FirstOrDefault()))
            {
                HomeViewModel fileInfo = new HomeViewModel();
                fileInfo = objHomeBusinessModel.GetFileDetailsByVisitId(VisitId, FileName, _homeService);
                if (!string.IsNullOrEmpty(fileInfo.FileName))
                {
                    string DownloadFileName = System.IO.Path.GetFileName(fileInfo.FilePath);
                    var DownloadFileData = System.IO.File.ReadAllBytes(fileInfo.FilePath);

                    Response.Clear();
                    Response.Buffer = true;
                    Response.Charset = "";
                    Response.Cache.SetCacheability(HttpCacheability.NoCache);
                    Response.ContentType = "application/*";
                    Response.AppendHeader("Content-Disposition", "attachment; filename=" + DownloadFileName);
                    Response.BinaryWrite(DownloadFileData);
                    Response.Flush();
                    Response.End();

                }

            }
            else
            {
                return View("UnAuthorized");
            }
            return null;
        }

        [HttpPost]
        public ActionResult UpdateInspectionDateByVisitID(HomeViewModel objHDM)
        {
            var isSuccess = false;
            isSuccess = objHomeBusinessModel.UpdateInspectionDateByVisitID(objHDM, _homeService);

            if (isSuccess)
            {
                return Json(new { status = isSuccess, message = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { status = isSuccess, message = "error" }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult InActivateProspective(int VisitPId, bool status)
        {
            var isSuccess = false;
            try
            {
                if (status == false)
                {
                    var cId = objHomeBusinessModel.InActivateProspective(VisitPId, CurrentUser.UserId, _homeService);
                    isSuccess = true;
                }
            }
            catch (Exception ex)
            {
                errorLogObj.LogError("Error occured while Inactivating Prospective", ex);
                isSuccess = false;
            }

            return Json(new { status = isSuccess }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public ActionResult OnHoldCancalledInspectionVisit(HomeViewModel objHDM)
        {
            var isSuccess = false;
            isSuccess = objHomeBusinessModel.OnHoldCancalledInspectionVisit(objHDM, _homeService);

            if (isSuccess)
            {
                return Json(new { status = isSuccess, message = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { status = isSuccess, message = "error" }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult SubmitInspectorNameByVisitID(HomeViewModel objHDM)
        {
            var isSuccess = false;
            isSuccess = objHomeBusinessModel.SubmitInspectorNameByVisitID(objHDM, _homeService);

            if (isSuccess)
            {
                return Json(new { status = isSuccess, message = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { status = isSuccess, message = "error" }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult ReportSubmitToClientDateByVisitID(HomeViewModel objHDM)
        {
            var isSuccess = false;
            isSuccess = objHomeBusinessModel.ReportSubmitToClientDateByVisitID(objHDM, _homeService);

            if (isSuccess)
            {
                return Json(new { status = isSuccess, message = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { status = isSuccess, message = "error" }, JsonRequestBehavior.AllowGet);
            }

        }
        
        [HttpPost]
        public ActionResult UpdateCommentsByVisitID(HomeViewModel objHDM)
        {
            var isSuccess = false;
            isSuccess = objHomeBusinessModel.UpdateCommentsByVisitID(objHDM, _homeService);

            if (isSuccess)
            {
                return Json(new { status = isSuccess, message = "" }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                return Json(new { status = isSuccess, message = "error" }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult UpdateCostValueByVisitID(HomeViewModel objHDM)
        {
            if (objHDM.ManufacturerId <= 0)
                return Json(new { status = false, totalCost = 0 });

            decimal totalCost = objHomeBusinessModel.UpdateCostValueByVisitID(objHDM, _homeService);

            return Json(new { status = true, totalCost = totalCost });

        }

        public ActionResult SortMyScheduleVisits(int statusId, string secName, string OrderBy)
        {
            objHomeBusinessModel.GetMyScheduledVisits(statusId, CurrentUser.SiteId, CurrentUser.UserId, _homeService);
            if ((OrderBy == "Asc") && (secName == "Date"))
                objHomeBusinessModel.LstHomeDetailViewModel = objHomeBusinessModel.LstHomeDetailViewModel.OrderBy(i => i.ScheduleDate).ToList();
            else if ((OrderBy == "Desc") && (secName == "Date"))
                objHomeBusinessModel.LstHomeDetailViewModel = objHomeBusinessModel.LstHomeDetailViewModel.OrderByDescending(i => i.ScheduleDate).ToList();
            else if ((OrderBy == "Asc") && (secName == "Status"))
                objHomeBusinessModel.LstHomeDetailViewModel = objHomeBusinessModel.LstHomeDetailViewModel.OrderBy(i => i.VisitStatusName).ToList();
            else if ((OrderBy == "Desc") && (secName == "Status"))
                objHomeBusinessModel.LstHomeDetailViewModel = objHomeBusinessModel.LstHomeDetailViewModel.OrderByDescending(i => i.VisitStatusName).ToList();
            return PartialView("_ViewMySchedules", objHomeBusinessModel.LstHomeDetailViewModel);
        }
    }
}