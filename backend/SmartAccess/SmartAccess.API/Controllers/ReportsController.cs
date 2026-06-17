using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportsController(ReportService reportService)
    {
        _reportService = reportService ?? throw new ArgumentNullException(nameof(reportService));
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var stats = await _reportService.GetTodayStatisticsAsync();
        return Ok(stats);
    }

    [HttpGet("statistics/department")]
    public async Task<IActionResult> GetStatisticsByDepartment()
    {
        var stats = await _reportService.GetStatisticsByDepartmentAsync();
        return Ok(stats);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserAttendanceReport(string userId)
    {
        var report = await _reportService.GetAttendanceReportByUserAsync(userId);
        return Ok(report);
    }
}
